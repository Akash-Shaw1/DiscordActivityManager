// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod manager;
mod rpc;
mod store;

use commands::*;
use manager::DiscordManagerHandle;
use store::StoreManager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::AppleScript,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            
            let store = StoreManager::new(config_dir);
            let manager = DiscordManagerHandle::new(app.handle().clone(), store);
            app.manage(manager);

            // Tray menu setup
            let quit_i = MenuItem::with_id(app, "quit", "Quit Discord Status Manager", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Window", true, None::<&str>)?;
            let disconnect_i = MenuItem::with_id(app, "disconnect", "Clear Status & Disconnect", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &disconnect_i, &quit_i])?;

            let default_icon = app.default_window_icon().cloned();
            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "disconnect" => {
                        let manager = app.state::<DiscordManagerHandle>();
                        manager.disconnect();
                    }
                    "quit" => {
                        let manager = app.state::<DiscordManagerHandle>();
                        manager.disconnect();
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = default_icon {
                builder = builder.icon(icon);
            }

            let _tray = builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            connect_discord,
            disconnect_discord,
            get_connection_state,
            set_activity,
            clear_activity,
            get_app_data,
            save_template,
            delete_template,
            save_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
