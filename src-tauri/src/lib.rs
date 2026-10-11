mod dosbox;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let root = std::env::var_os("RETRODOS_DATA_DIR")
                .map(std::path::PathBuf::from)
                .unwrap_or(app.path().app_data_dir()?.join("dos-games"));
            let store = dosbox::Store::open(root).map_err(std::io::Error::other)?;
            app.manage(std::sync::Arc::new(std::sync::Mutex::new(store)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![dosbox::dosbox_request])
        .build(tauri::generate_context!())
        .expect("failed to build RetroDOS")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                if let Ok(mut store) = app.state::<dosbox::NativeState>().lock() {
                    store.stop_all();
                }
            }
        });
}
