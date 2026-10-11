use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::{Child, Command},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri_plugin_dialog::DialogExt;

type Result<T> = std::result::Result<T, String>;
const MAX_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const MAX_FILES: u64 = 50_000;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub name: String,
    pub code: String,
    pub executable: String,
    pub args: Vec<String>,
    pub cycles: String,
    pub memory: u32,
    pub sound: bool,
    pub fullscreen: bool,
    pub auto_backup: bool,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Backup {
    pub id: String,
    pub created_at: u64,
    pub bytes: u64,
    pub files: u64,
    pub kind: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: String,
    pub config: Config,
    pub backups: Vec<Backup>,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Registry {
    version: u8,
    runtime: Option<String>,
    games: Vec<Game>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    runtime: Option<String>,
    games: Vec<Game>,
    running: Vec<String>,
    data_path: String,
}
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "camelCase")]
pub enum Request {
    Status,
    ChooseRuntime,
    ChooseFolder,
    SetRuntime { path: String },
    Register { source: String, config: Config },
    Update { id: String, config: Config },
    Launch { code: String },
    Stop { id: String },
    Backup { id: String },
    Restore { id: String, backup: String },
    DeleteBackup { id: String, backup: String },
    Remove { id: String },
}
#[derive(Serialize)]
pub struct Reply {
    state: Option<Snapshot>,
    path: Option<String>,
    message: String,
}
pub struct Store {
    root: PathBuf,
    registry: Registry,
    children: HashMap<String, Child>,
    serial: u64,
}
pub type NativeState = Arc<Mutex<Store>>;
fn io(error: impl std::fmt::Display) -> String {
    format!("DOSゲーム管理: {error}")
}
fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn no_link(path: &Path) -> Result<fs::Metadata> {
    let meta = fs::symlink_metadata(path).map_err(io)?;
    if meta.file_type().is_symlink() {
        return Err("リンクを含むフォルダーは利用できません。".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if meta.file_attributes() & 0x400 != 0 {
            return Err("ジャンクションを含むフォルダーは利用できません。".into());
        }
    }
    Ok(meta)
}
fn inspect(path: &Path, count: &mut (u64, u64)) -> Result<()> {
    let meta = no_link(path)?;
    if meta.is_dir() {
        count.0 += 1;
        if count.0 > MAX_FILES {
            return Err("項目数の上限（50,000）を超えています。".into());
        }
        for entry in fs::read_dir(path).map_err(io)? {
            inspect(&entry.map_err(io)?.path(), count)?;
        }
    } else if meta.is_file() {
        count.0 += 1;
        count.1 = count
            .1
            .checked_add(meta.len())
            .ok_or("サイズが大きすぎます。")?;
        if count.0 > MAX_FILES || count.1 > MAX_BYTES {
            return Err("ゲームは50,000項目・2GB以下にしてください。".into());
        }
    } else {
        return Err("通常のファイル・フォルダーだけを利用できます。".into());
    }
    Ok(())
}
fn copy_tree(source: &Path, target: &Path) -> Result<()> {
    let meta = no_link(source)?;
    if meta.is_dir() {
        fs::create_dir_all(target).map_err(io)?;
        for entry in fs::read_dir(source).map_err(io)? {
            let entry = entry.map_err(io)?;
            copy_tree(&entry.path(), &target.join(entry.file_name()))?;
        }
    } else {
        fs::copy(source, target).map_err(io)?;
    }
    Ok(())
}
fn check_links(path: &Path) -> Result<()> {
    if no_link(path)?.is_dir() {
        for entry in fs::read_dir(path).map_err(io)? {
            check_links(&entry.map_err(io)?.path())?;
        }
    }
    Ok(())
}
fn component(part: &str) -> bool {
    let bits: Vec<_> = part.split('.').collect();
    bits.len() <= 2
        && !bits[0].is_empty()
        && bits[0].len() <= 8
        && (bits.len() == 1 || (!bits[1].is_empty() && bits[1].len() <= 3))
        && bits.iter().all(|s| {
            s.bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
        })
        && !["CON", "PRN", "AUX", "NUL"].contains(&bits[0].to_uppercase().as_str())
        && !(bits[0].len() == 4
            && (bits[0].to_uppercase().starts_with("COM")
                || bits[0].to_uppercase().starts_with("LPT"))
            && bits[0].as_bytes()[3].is_ascii_digit())
}
fn validate_config(config: &Config) -> Result<()> {
    if config.name.trim().is_empty() || config.name.len() > 200 {
        return Err("ゲーム名を入力してください（200バイト以内）。".into());
    }
    if !config.code.starts_with("DOS_")
        || config.code.len() < 5
        || config.code.len() > 32
        || !config
            .code
            .bytes()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == b'_')
    {
        return Err(
            "コードは DOS_ から始まる英大文字・数字・_（32文字以内）にしてください。".into(),
        );
    }
    let executable = config.executable.replace('\\', "/");
    if executable.len() > 200
        || !executable.split('/').all(component)
        || !["EXE", "COM", "BAT"].contains(
            &executable
                .rsplit('.')
                .next()
                .unwrap_or("")
                .to_uppercase()
                .as_str(),
        )
    {
        return Err(
            "起動ファイルはゲーム内の相対パス・DOS 8.3形式の EXE / COM / BAT にしてください。"
                .into(),
        );
    }
    if config.args.len() > 20
        || config.args.iter().any(|arg| {
            arg.is_empty()
                || arg.len() > 100
                || !arg
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"_-.=/:\\".contains(&c))
        })
    {
        return Err(
            "起動引数は英数字と _ - . = / : \\ のみ使用できます。空白で区切ってください。".into(),
        );
    }
    if config.cycles != "auto"
        && !config
            .cycles
            .parse::<u32>()
            .map(|n| (100..=500_000).contains(&n))
            .unwrap_or(false)
    {
        return Err("CPU速度は auto または100〜500000の整数にしてください。".into());
    }
    if !(1..=64).contains(&config.memory) {
        return Err("メモリーは1〜64MBにしてください。".into());
    }
    Ok(())
}
fn runtime(path: &str) -> Result<PathBuf> {
    let path = PathBuf::from(path);
    if !no_link(&path)?.is_file() {
        return Err("DOSBoxの実行ファイルを指定してください。".into());
    }
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();
    if !["dosbox.exe", "dosbox-staging.exe", "dosbox-x.exe"].contains(&name.as_str()) {
        return Err("DOSBox.exe / dosbox-staging.exe / dosbox-x.exe を指定してください。".into());
    }
    path.canonicalize().map_err(io)
}
fn launch_config(config: &Config) -> String {
    format!("[sdl]\nfullscreen={}\n[cpu]\ncycles={}\n[dosbox]\nmemsize={}\n[sblaster]\nsbtype={}\n[gus]\ngus=false\n[midi]\nmpu401={}\n[speaker]\npcspeaker={}\ntandy={}\ndisney={}\n[ipx]\nipx=false\n",
        config.fullscreen, config.cycles, config.memory, if config.sound { "sb16" } else { "none" },
        if config.sound { "intelligent" } else { "none" }, config.sound,
        if config.sound { "auto" } else { "off" }, config.sound)
}
fn launch_commands(config: &Config) -> Vec<String> {
    // ASCII relative paths avoid sending Japanese host paths to the DOS parser.
    // Run from the profile, so a game's dosbox.conf cannot override our settings.
    let relative = config.executable.replace('/', "\\");
    let (directory, executable) = relative.rsplit_once('\\').unwrap_or(("", &relative));
    let mut commands = vec![
        "mount c game".into(),
        "c:".into(),
        "config -securemode".into(),
    ];
    if !directory.is_empty() {
        commands.push(format!("cd {directory}"));
    }
    let call = if executable.to_uppercase().ends_with(".BAT") {
        "call "
    } else {
        ""
    };
    commands.push(format!("{call}{executable} {}", config.args.join(" ")));
    commands.push("exit".into());
    commands
}

impl Store {
    pub fn open(root: PathBuf) -> Result<Self> {
        fs::create_dir_all(&root).map_err(io)?;
        no_link(&root)?;
        let root = root.canonicalize().map_err(io)?;
        let registry = if root.join("registry.json").exists() {
            let registry: Registry =
                serde_json::from_slice(&fs::read(root.join("registry.json")).map_err(io)?)
                    .map_err(io)?;
            if registry.version != 1 {
                return Err("DOSゲーム登録データの形式が異なります。".into());
            }
            for game in &registry.games {
                validate_config(&game.config)?;
                if !Self::valid_id(&game.id) || game.backups.iter().any(|b| !Self::valid_id(&b.id))
                {
                    return Err("登録データのIDが不正です。".into());
                }
            }
            registry
        } else {
            Registry {
                version: 1,
                ..Registry::default()
            }
        };
        Ok(Self {
            root,
            registry,
            children: HashMap::new(),
            serial: 0,
        })
    }
    fn valid_id(id: &str) -> bool {
        id.len() <= 60
            && id.starts_with('g')
            && id[1..].bytes().all(|c| c.is_ascii_digit() || c == b'-')
            && id.len() > 1
    }
    fn id(&mut self) -> String {
        self.serial += 1;
        format!("g{}-{}", timestamp(), self.serial)
    }
    fn index(&self, id: &str) -> Result<usize> {
        self.registry
            .games
            .iter()
            .position(|g| g.id == id)
            .ok_or_else(|| "登録したゲームが見つかりません。".into())
    }
    fn persist(&self) -> Result<()> {
        let temporary = self.root.join("registry.tmp");
        fs::write(
            &temporary,
            serde_json::to_vec_pretty(&self.registry).map_err(io)?,
        )
        .map_err(io)?;
        fs::rename(temporary, self.root.join("registry.json")).map_err(io)
    }
    fn profile(&self, id: &str) -> Result<PathBuf> {
        if !Self::valid_id(id) {
            return Err("ゲームIDが不正です。".into());
        }
        let path = self.root.join(id);
        if path.exists() {
            no_link(&path)?;
            if !path.canonicalize().map_err(io)?.starts_with(&self.root) {
                return Err("管理領域の外には操作できません。".into());
            }
        }
        Ok(path)
    }
    fn remove_owned(&self, path: &Path) -> Result<()> {
        if !path.starts_with(&self.root) || path == self.root {
            return Err("管理領域の外には削除できません。".into());
        }
        if path.exists() {
            if !path.canonicalize().map_err(io)?.starts_with(&self.root) {
                return Err("管理領域の外には削除できません。".into());
            }
            check_links(path)?;
            fs::remove_dir_all(path).map_err(io)?;
        }
        Ok(())
    }
    fn refresh(&mut self) {
        self.children
            .retain(|_, child| !matches!(child.try_wait(), Ok(Some(_))));
    }
    fn idle(&mut self, id: &str) -> Result<()> {
        self.refresh();
        if self.children.contains_key(id) {
            Err("ゲームを終了してから操作してください。".into())
        } else {
            Ok(())
        }
    }
    fn state(&mut self) -> Snapshot {
        self.refresh();
        Snapshot {
            runtime: self.registry.runtime.clone(),
            games: self.registry.games.clone(),
            running: self.children.keys().cloned().collect(),
            data_path: self.root.to_string_lossy().into(),
        }
    }
    fn executable(&self, id: &str, config: &Config) -> Result<PathBuf> {
        let folder = self.profile(id)?.join("game");
        no_link(&folder)?;
        let mut file = folder.clone();
        for component in config.executable.replace('\\', "/").split('/') {
            file.push(component);
            no_link(&file)?;
        }
        if !file.is_file()
            || !file
                .canonicalize()
                .map_err(io)?
                .starts_with(folder.canonicalize().map_err(io)?)
        {
            return Err("起動ファイルが見つかりません。".into());
        }
        Ok(file)
    }
    fn register(&mut self, source: &str, config: Config) -> Result<()> {
        validate_config(&config)?;
        if self
            .registry
            .games
            .iter()
            .any(|g| g.config.code == config.code)
        {
            return Err("ゲームコードが重複しています。".into());
        }
        if self.registry.games.len() >= 100 {
            return Err("登録できるDOSゲームは100件までです。".into());
        }
        let source = Path::new(source);
        if !no_link(source)?.is_dir() {
            return Err("ゲーム専用フォルダーを指定してください。".into());
        }
        let source = source.canonicalize().map_err(io)?;
        if source.parent().is_none()
            || self.root.starts_with(&source)
            || source.starts_with(&self.root)
        {
            return Err("ドライブ全体やRetroDOS管理領域は登録できません。".into());
        }
        inspect(&source, &mut (0, 0))?;
        let id = self.id();
        let profile = self.profile(&id)?;
        fs::create_dir(&profile).map_err(io)?;
        if let Err(error) = copy_tree(&source, &profile.join("game"))
            .and_then(|_| self.executable(&id, &config).map(|_| ()))
        {
            let _ = self.remove_owned(&profile);
            return Err(error);
        }
        self.registry.games.push(Game {
            id,
            config,
            backups: vec![],
        });
        if let Err(error) = self.persist() {
            self.registry.games.pop();
            let _ = self.remove_owned(&profile);
            return Err(error);
        }
        Ok(())
    }
    fn backup(&mut self, id: &str, kind: &str) -> Result<String> {
        self.idle(id)?;
        let index = self.index(id)?;
        if self.registry.games[index].backups.len() >= 30 {
            return Err("バックアップは30件までです。不要なものを削除してください。".into());
        }
        let profile = self.profile(id)?;
        let mut count = (0, 0);
        inspect(&profile.join("game"), &mut count)?;
        let backup_id = self.id();
        let target = profile.join("backups").join(&backup_id);
        if profile.join("backups").exists() {
            no_link(&profile.join("backups"))?;
        }
        if let Err(error) = copy_tree(&profile.join("game"), &target) {
            let _ = self.remove_owned(&target);
            return Err(error);
        }
        self.registry.games[index].backups.push(Backup {
            id: backup_id.clone(),
            created_at: timestamp(),
            bytes: count.1,
            files: count.0,
            kind: kind.into(),
        });
        if let Err(error) = self.persist() {
            self.registry.games[index].backups.pop();
            let _ = self.remove_owned(&target);
            return Err(error);
        }
        Ok(backup_id)
    }
    fn restore(&mut self, id: &str, backup: &str) -> Result<()> {
        self.idle(id)?;
        let index = self.index(id)?;
        if !self.registry.games[index]
            .backups
            .iter()
            .any(|b| b.id == backup)
        {
            return Err("バックアップが見つかりません。".into());
        }
        let profile = self.profile(id)?;
        no_link(&profile.join("backups"))?;
        let source = profile.join("backups").join(backup);
        inspect(&source, &mut (0, 0))?;
        self.backup(id, "beforeRestore")?;
        let stage = profile.join(self.id());
        if let Err(error) = copy_tree(&source, &stage) {
            let _ = self.remove_owned(&stage);
            return Err(error);
        }
        let old = profile.join(self.id());
        let game = profile.join("game");
        fs::rename(&game, &old).map_err(io)?;
        if let Err(error) = fs::rename(&stage, &game) {
            let _ = fs::rename(&old, &game);
            let _ = self.remove_owned(&stage);
            return Err(io(error));
        }
        self.remove_owned(&old)
    }
    fn launch(&mut self, code: &str) -> Result<()> {
        let game = self
            .registry
            .games
            .iter()
            .find(|g| g.config.code.eq_ignore_ascii_case(code))
            .cloned()
            .ok_or("DOSゲームが見つかりません。DOSBOXで登録してください。")?;
        self.idle(&game.id)?;
        validate_config(&game.config)?;
        self.executable(&game.id, &game.config)?;
        let executable = runtime(
            self.registry
                .runtime
                .as_deref()
                .ok_or("DOSBOX画面でDOSBox本体を指定してください。")?,
        )?;
        if game.config.auto_backup {
            self.backup(&game.id, "beforeLaunch")?;
        }
        let profile = self.profile(&game.id)?;
        inspect(&profile.join("game"), &mut (0, 0))?;
        fs::write(profile.join("launch.conf"), launch_config(&game.config)).map_err(io)?;
        let mut command = Command::new(executable);
        // Ignore every inherited autoexec. Only these validated commands mount a host folder.
        command
            .current_dir(&profile)
            .args(["-conf", "launch.conf", "-noautoexec", "-exit"]);
        for line in launch_commands(&game.config) {
            command.arg("-c").arg(line);
        }
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let child = command.spawn().map_err(io)?;
        self.children.insert(game.id, child);
        Ok(())
    }
    fn handle(&mut self, request: Request) -> Result<String> {
        match request {
            Request::Status => return Ok(String::new()),
            Request::SetRuntime { path } => {
                let old = self.registry.runtime.clone();
                self.registry.runtime = Some(runtime(&path)?.to_string_lossy().into());
                if let Err(e) = self.persist() {
                    self.registry.runtime = old;
                    return Err(e);
                }
            }
            Request::Register { source, config } => self.register(&source, config)?,
            Request::Update { id, config } => {
                self.idle(&id)?;
                validate_config(&config)?;
                self.executable(&id, &config)?;
                let index = self.index(&id)?;
                if self
                    .registry
                    .games
                    .iter()
                    .any(|g| g.id != id && g.config.code == config.code)
                {
                    return Err("ゲームコードが重複しています。".into());
                }
                let old = self.registry.games[index].config.clone();
                self.registry.games[index].config = config;
                if let Err(e) = self.persist() {
                    self.registry.games[index].config = old;
                    return Err(e);
                }
            }
            Request::Launch { code } => {
                self.launch(&code)?;
                return Ok(
                    "DOSBoxでゲームを起動しました。終了する場合はDOSBoxを閉じてください。".into(),
                );
            }
            Request::Stop { id } => {
                self.refresh();
                if let Some(child) = self.children.get_mut(&id) {
                    child.kill().map_err(io)?;
                    child.wait().map_err(io)?;
                }
                self.children.remove(&id);
            }
            Request::Backup { id } => {
                self.backup(&id, "manual")?;
            }
            Request::Restore { id, backup } => self.restore(&id, &backup)?,
            Request::DeleteBackup { id, backup } => {
                self.idle(&id)?;
                let index = self.index(&id)?;
                let position = self.registry.games[index]
                    .backups
                    .iter()
                    .position(|b| b.id == backup)
                    .ok_or("バックアップが見つかりません。")?;
                let path = self.profile(&id)?.join("backups").join(&backup);
                let removed = self.registry.games[index].backups.remove(position);
                if let Err(e) = self.persist() {
                    self.registry.games[index].backups.insert(position, removed);
                    return Err(e);
                }
                self.remove_owned(&path)?;
            }
            Request::Remove { id } => {
                self.idle(&id)?;
                let index = self.index(&id)?;
                let profile = self.profile(&id)?;
                check_links(&profile)?;
                let removed = self.registry.games.remove(index);
                if let Err(e) = self.persist() {
                    self.registry.games.insert(index, removed);
                    return Err(e);
                }
                self.remove_owned(&profile)?;
            }
            Request::ChooseRuntime | Request::ChooseFolder => unreachable!(),
        }
        Ok("保存しました。".into())
    }
    pub fn stop_all(&mut self) {
        for child in self.children.values_mut() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.children.clear();
    }
}
impl Drop for Store {
    fn drop(&mut self) {
        self.stop_all();
    }
}

#[tauri::command]
pub async fn dosbox_request(
    app: tauri::AppHandle,
    state: tauri::State<'_, NativeState>,
    request: Request,
) -> Result<Reply> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let path = match request {
            Request::ChooseRuntime => Some(
                app.dialog()
                    .file()
                    .add_filter("DOSBox", &["exe"])
                    .blocking_pick_file(),
            ),
            Request::ChooseFolder => Some(app.dialog().file().blocking_pick_folder()),
            _ => None,
        };
        if let Some(path) = path {
            return Ok(Reply {
                state: None,
                path: path
                    .and_then(|p| p.into_path().ok())
                    .map(|p| p.to_string_lossy().into()),
                message: String::new(),
            });
        }
        let mut store = state.lock().map_err(io)?;
        let message = store.handle(request)?;
        Ok(Reply {
            state: Some(store.state()),
            path: None,
            message,
        })
    })
    .await
    .map_err(io)?
}

#[cfg(test)]
mod tests {
    use super::*;
    fn config() -> Config {
        Config {
            name: "Test".into(),
            code: "DOS_TEST".into(),
            executable: "TEST.COM".into(),
            args: vec![],
            cycles: "auto".into(),
            memory: 16,
            sound: true,
            fullscreen: false,
            auto_backup: true,
        }
    }
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            static SERIAL: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
            let path = std::env::temp_dir().join(format!(
                "retrodos-test-{}-{}-{}",
                std::process::id(),
                timestamp(),
                SERIAL.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
            ));
            fs::create_dir_all(&path).unwrap();
            Self(path)
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    #[test]
    fn rejects_paths_and_command_injection() {
        for path in [
            "../TEST.COM",
            "C:\\TEST.COM",
            "LONGFILENAME.EXE",
            "TEST.COM\nexit",
            "CON.EXE",
            "/TEST.COM",
        ] {
            let mut c = config();
            c.executable = path.into();
            assert!(validate_config(&c).is_err(), "{path}");
        }
        for arg in ["hi & exit", "%PATH%", "a|b", "x\nexit", ">FILE", "\"x\""] {
            let mut c = config();
            c.args = vec![arg.into()];
            assert!(validate_config(&c).is_err());
        }
        let c = config();
        assert!(validate_config(&c).is_ok());
        assert!(launch_config(&c).is_ascii());
        let commands = launch_commands(&c);
        assert_eq!(&commands[..3], ["mount c game", "c:", "config -securemode"]);
        assert!(commands.iter().all(|s| s.is_ascii()));
    }
    #[test]
    fn batch_launch_changes_directory_and_returns_to_exit() {
        let mut c = config();
        c.executable = "BIN/START.BAT".into();
        c.args = vec!["-demo".into()];
        assert!(validate_config(&c).is_ok());
        assert_eq!(
            &launch_commands(&c)[3..],
            ["cd BIN", "call START.BAT -demo", "exit"]
        );
    }
    #[test]
    fn import_snapshot_restore_and_persistence() {
        let fixture = Fixture::new();
        let source = fixture.0.join("original");
        fs::create_dir(&source).unwrap();
        fs::write(source.join("TEST.COM"), [0xc3]).unwrap();
        fs::write(source.join("SAVE.DAT"), b"first").unwrap();
        let root = fixture.0.join("managed");
        let mut store = Store::open(root.clone()).unwrap();
        store.register(source.to_str().unwrap(), config()).unwrap();
        let id = store.registry.games[0].id.clone();
        let game = store.profile(&id).unwrap().join("game");
        let backup = store.backup(&id, "manual").unwrap();
        fs::write(game.join("SAVE.DAT"), b"second").unwrap();
        fs::write(game.join("NEW.DAT"), b"new").unwrap();
        store.restore(&id, &backup).unwrap();
        assert_eq!(fs::read(game.join("SAVE.DAT")).unwrap(), b"first");
        assert!(!game.join("NEW.DAT").exists());
        assert_eq!(fs::read(source.join("SAVE.DAT")).unwrap(), b"first");
        let safeguard = store.registry.games[0].backups.last().unwrap();
        assert_eq!(safeguard.kind, "beforeRestore");
        assert_eq!(
            fs::read(
                store
                    .profile(&id)
                    .unwrap()
                    .join("backups")
                    .join(&safeguard.id)
                    .join("SAVE.DAT")
            )
            .unwrap(),
            b"second"
        );
        drop(store);
        let mut store = Store::open(root).unwrap();
        assert_eq!(store.registry.games.len(), 1);
        assert_eq!(store.registry.games[0].backups.len(), 2);
        assert!(store
            .register(fixture.0.to_str().unwrap(), config())
            .is_err());
        assert!(store.profile("../escape").is_err());
        assert!(store.remove_owned(&source).is_err());
        store.handle(Request::Remove { id }).unwrap();
        assert!(source.join("TEST.COM").exists());
    }
    #[test]
    fn rejects_missing_executable_and_symlinks() {
        let fixture = Fixture::new();
        let source = fixture.0.join("source");
        fs::create_dir(&source).unwrap();
        let mut store = Store::open(fixture.0.join("managed")).unwrap();
        assert!(store.register(source.to_str().unwrap(), config()).is_err());
        assert!(store.registry.games.is_empty());
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&fixture.0, source.join("link")).unwrap();
            assert!(inspect(&source, &mut (0, 0)).is_err());
        }
        #[cfg(windows)]
        {
            if std::os::windows::fs::symlink_dir(&fixture.0, source.join("link")).is_ok() {
                assert!(inspect(&source, &mut (0, 0)).is_err());
                fs::remove_dir(source.join("link")).unwrap();
            }
        }
    }
}
