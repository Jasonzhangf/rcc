fn main() {
    if let Err(error) = rcc_core_host::run_from_env() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
