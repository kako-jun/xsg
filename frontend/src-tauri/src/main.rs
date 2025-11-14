// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "XSG")]
#[command(about = "XSG - Professional Signal Generator for Display Calibration", long_about = None)]
struct Args {
    /// Pattern to display on startup
    #[arg(long, default_value = "colorbar")]
    pattern: String,

    /// Display specification (all, primary, left, right, top, bottom)
    #[arg(long, default_value = "all")]
    display: String,

    /// List available displays and exit
    #[arg(long)]
    list_displays: bool,
}

fn main() {
    let args = Args::parse();
    app_lib::run(args.pattern, args.display, args.list_displays);
}
