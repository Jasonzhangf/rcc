use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::fs;
use std::path::{Path, PathBuf};

pub const BUNDLED_USER_CONFIG_JSON: &str = include_str!("../config.json");
pub const BUNDLED_SYSTEM_CONFIG_JSON: &str = include_str!("../system.config.json");

const DEFAULT_USER_DIR_NAME: &str = ".rcc";
const LEGACY_USER_DIR_NAME: &str = ".routecodex";
const DEFAULT_USER_CONFIG_FILE_NAME: &str = "config.json";
const USER_DIR_ENV_KEYS: [&str; 3] = ["RCC_HOME", "ROUTECODEX_USER_DIR", "ROUTECODEX_HOME"];
const USER_CONFIG_ENV_KEYS: [&str; 3] = [
    "RCC4_CONFIG_PATH",
    "ROUTECODEX_CONFIG",
    "ROUTECODEX_CONFIG_PATH",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfigPathSource {
    Explicit,
    Environment,
    Default,
}

#[derive(Debug, Clone)]
pub struct ResolvedUserConfigPath {
    pub path: PathBuf,
    pub source: ConfigPathSource,
}

#[derive(Debug, Clone)]
pub struct LoadedConfig {
    pub effective: EffectiveConfig,
    pub resolved_user_config_path: PathBuf,
    pub user_config_path_source: ConfigPathSource,
    pub user_config_exists: bool,
}

impl LoadedConfig {
    pub fn uses_bundled_user_config(&self) -> bool {
        !self.user_config_exists
    }
}

#[derive(Debug, Clone)]
pub struct ConfigError {
    message: String,
}

impl ConfigError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl Display for ConfigError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for ConfigError {}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EffectiveConfig {
    pub runtime_home: RuntimeHomeConfig,
    pub host: HostConfig,
    pub router: RouterConfig,
    pub provider: ProviderConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RouterConfig {
    pub bootstrap: RouterBootstrapConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(deny_unknown_fields)]
pub struct RouterBootstrapConfig {
    #[serde(default)]
    pub routes: BTreeMap<String, Vec<RouterBootstrapTierConfig>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RouterBootstrapTierConfig {
    pub id: String,
    pub targets: Vec<String>,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RuntimeHomeConfig {
    pub primary_dir_name: String,
    pub legacy_dir_name: String,
    pub subdirs: RuntimeHomeSubdirsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RuntimeHomeSubdirsConfig {
    pub auth: String,
    pub tokens: String,
    pub quota: String,
    pub state: String,
    pub logs: String,
    pub sessions: String,
    pub snapshots: String,
    pub provider: String,
    pub config: String,
    pub guardian: String,
    pub login: String,
    pub statics: String,
    pub errorsamples: String,
    pub llms_shadow: String,
    pub camoufox_fingerprint: String,
    pub camoufox_profiles: String,
    pub docs: String,
    pub precommand: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HostConfig {
    pub service_name: String,
    pub server: HostServerConfig,
    pub defaults: HostDefaultsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HostServerConfig {
    pub addr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HostDefaultsConfig {
    pub smoke: HostSmokeDefaultsConfig,
    pub chat: HostChatDefaultsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HostSmokeDefaultsConfig {
    pub operation: String,
    pub payload: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HostChatDefaultsConfig {
    pub operation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ProviderConfig {
    pub runtime: ProviderRuntimeConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProviderRuntimeKind {
    Noop,
    Transport,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ProviderRuntimeConfig {
    pub kind: ProviderRuntimeKind,
    pub transport: TransportProviderConfig,
    #[serde(default)]
    pub registry: ProviderRuntimeRegistryConfig,
    pub retry: ProviderRetryConfig,
}

impl ProviderRuntimeConfig {
    pub fn transport_config_value(&self) -> Value {
        self.transport.config_value()
    }

    pub fn transport_provider_family(&self) -> Option<&'static str> {
        infer_transport_provider_family(&self.transport)
    }

    pub fn registry_transport_config_values(&self) -> BTreeMap<String, Value> {
        self.registry
            .transports
            .iter()
            .map(|(target, transport)| (target.clone(), transport.config_value()))
            .collect()
    }

    pub fn registry_transport_provider_families(&self) -> BTreeMap<String, String> {
        self.registry
            .transports
            .iter()
            .filter_map(|(target, transport)| {
                infer_transport_provider_family(transport)
                    .map(|family| (target.clone(), family.to_string()))
            })
            .collect()
    }

    pub fn retry_config_value(&self) -> Value {
        json!({
            "max_attempts": self.retry.max_attempts,
        })
    }
}

fn infer_transport_provider_family(transport: &TransportProviderConfig) -> Option<&'static str> {
    let endpoint = transport.endpoint.trim().to_ascii_lowercase();
    if endpoint.is_empty() {
        return None;
    }
    if endpoint == "/v1/messages" || endpoint == "/messages" || endpoint == "messages" {
        return Some("anthropic");
    }
    if endpoint == "/v1/responses" || endpoint == "/responses" || endpoint == "responses" {
        return Some("responses");
    }
    None
}

const DEFAULT_ANTHROPIC_VERSION: &str = "2023-06-01";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TransportProviderConfig {
    pub base_url: String,
    pub endpoint: String,
    pub timeout_ms: u64,
    pub auth: TransportAuthConfig,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
}

impl TransportProviderConfig {
    pub fn config_value(&self) -> Value {
        let mut auth = Map::new();
        auth.insert(
            "type".to_string(),
            Value::String(self.auth.auth_type.clone()),
        );
        auth.insert(
            "api_key".to_string(),
            Value::String(self.auth.api_key.clone()),
        );
        if let Some(header_name) = &self.auth.header_name {
            auth.insert(
                "header_name".to_string(),
                Value::String(header_name.clone()),
            );
        }
        if let Some(prefix) = &self.auth.prefix {
            auth.insert("prefix".to_string(), Value::String(prefix.clone()));
        }

        let mut value = json!({
            "base_url": self.base_url,
            "endpoint": self.endpoint,
            "timeout_ms": self.timeout_ms,
            "auth": Value::Object(auth),
        });
        if !self.headers.is_empty() {
            let headers = self
                .headers
                .iter()
                .map(|(key, value)| (key.clone(), Value::String(value.clone())))
                .collect();
            value
                .as_object_mut()
                .expect("transport provider config json object")
                .insert("headers".to_string(), Value::Object(headers));
        }
        value
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(deny_unknown_fields)]
pub struct ProviderRuntimeRegistryConfig {
    #[serde(default)]
    pub transports: BTreeMap<String, TransportProviderConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TransportAuthConfig {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub api_key: String,
    pub header_name: Option<String>,
    pub prefix: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ProviderRetryConfig {
    pub max_attempts: u32,
}

pub fn load_config(explicit_user_config_path: Option<&str>) -> Result<LoadedConfig, ConfigError> {
    let resolved = resolve_user_config_path(explicit_user_config_path);
    let system_value = load_system_config_value()?;
    let (user_value, user_config_exists) = load_user_config_value(&resolved.path)?;
    let mut effective_value = merge_json(system_value, user_value);
    normalize_provider_runtime_registry_defaults(&mut effective_value)?;
    let effective =
        serde_json::from_value::<EffectiveConfig>(effective_value).map_err(|error| {
            ConfigError::new(format!("failed to deserialize effective config: {error}"))
        })?;

    Ok(LoadedConfig {
        effective,
        resolved_user_config_path: resolved.path,
        user_config_path_source: resolved.source,
        user_config_exists,
    })
}

fn normalize_provider_runtime_registry_defaults(value: &mut Value) -> Result<(), ConfigError> {
    let Some(root) = value.as_object_mut() else {
        return Ok(());
    };
    let Some(provider) = root.get_mut("provider").and_then(Value::as_object_mut) else {
        return Ok(());
    };
    let Some(runtime) = provider.get_mut("runtime").and_then(Value::as_object_mut) else {
        return Ok(());
    };
    let transport_defaults = runtime
        .get("transport")
        .cloned()
        .filter(Value::is_object)
        .ok_or_else(|| {
            ConfigError::new(
                "invalid effective config: `provider.runtime.transport` must be an object before registry normalization",
            )
        })?;
    let Some(registry) = runtime.get_mut("registry").and_then(Value::as_object_mut) else {
        return Ok(());
    };
    let Some(transports) = registry
        .get_mut("transports")
        .and_then(Value::as_object_mut)
    else {
        return Ok(());
    };

    for (target, transport) in transports.iter_mut() {
        if !transport.is_object() {
            return Err(ConfigError::new(format!(
                "invalid effective config: `provider.runtime.registry.transports.{target}` must be an object",
            )));
        }
        *transport = merge_json(transport_defaults.clone(), transport.clone());
    }

    Ok(())
}

pub fn resolve_user_config_path(explicit_user_config_path: Option<&str>) -> ResolvedUserConfigPath {
    if let Some(path) = explicit_user_config_path.and_then(trimmed_non_empty) {
        return ResolvedUserConfigPath {
            path: resolve_candidate_path(path, None),
            source: ConfigPathSource::Explicit,
        };
    }

    for key in USER_CONFIG_ENV_KEYS {
        if let Some(path) = env::var(key).ok().as_deref().and_then(trimmed_non_empty) {
            return ResolvedUserConfigPath {
                path: resolve_candidate_path(path, None),
                source: ConfigPathSource::Environment,
            };
        }
    }

    ResolvedUserConfigPath {
        path: resolve_default_user_config_path(None),
        source: ConfigPathSource::Default,
    }
}

pub fn resolve_rcc_user_dir() -> PathBuf {
    resolve_rcc_user_dir_with_home_override(None)
}

fn load_system_config_value() -> Result<Value, ConfigError> {
    serde_json::from_str(BUNDLED_SYSTEM_CONFIG_JSON).map_err(|error| {
        ConfigError::new(format!("failed to parse bundled system config: {error}"))
    })
}

fn load_user_config_value(path: &Path) -> Result<(Value, bool), ConfigError> {
    match fs::read_to_string(path) {
        Ok(content) => Ok((
            normalize_user_config_value(parse_json_text(&content, "user config")?)?,
            true,
        )),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok((
            normalize_user_config_value(parse_json_text(
                BUNDLED_USER_CONFIG_JSON,
                "bundled user config",
            )?)?,
            false,
        )),
        Err(error) => Err(ConfigError::new(format!(
            "failed to read user config {}: {error}",
            path.display()
        ))),
    }
}

fn parse_json_text(content: &str, label: &str) -> Result<Value, ConfigError> {
    serde_json::from_str::<Value>(content)
        .map_err(|error| ConfigError::new(format!("failed to parse {label}: {error}")))
}

fn normalize_user_config_value(mut value: Value) -> Result<Value, ConfigError> {
    normalize_legacy_httpserver(&mut value);
    normalize_legacy_virtualrouter_provider_runtime(&mut value)?;
    normalize_legacy_virtualrouter_router_bootstrap(&mut value)?;
    normalize_legacy_virtualrouter_provider_registry(&mut value)?;
    Ok(value)
}

fn normalize_legacy_httpserver(value: &mut Value) {
    let Some(root) = value.as_object_mut() else {
        return;
    };
    if user_host_addr_already_present(root) {
        return;
    }

    let Some(httpserver) = root.get("httpserver").and_then(Value::as_object) else {
        return;
    };
    let host = httpserver
        .get("host")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let port = httpserver.get("port").and_then(Value::as_u64).or_else(|| {
        httpserver
            .get("port")
            .and_then(Value::as_i64)
            .map(|value| value as u64)
    });
    let Some(addr) = compose_host_addr(host, port) else {
        return;
    };

    let host_entry = root.entry("host".to_string()).or_insert_with(|| json!({}));
    let Some(host_obj) = host_entry.as_object_mut() else {
        return;
    };
    let server_entry = host_obj
        .entry("server".to_string())
        .or_insert_with(|| json!({}));
    let Some(server_obj) = server_entry.as_object_mut() else {
        return;
    };
    server_obj
        .entry("addr".to_string())
        .or_insert(Value::String(addr));
}

fn user_host_addr_already_present(root: &Map<String, Value>) -> bool {
    root.get("host")
        .and_then(Value::as_object)
        .and_then(|host| host.get("server"))
        .and_then(Value::as_object)
        .and_then(|server| server.get("addr"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .is_some()
}

fn compose_host_addr(host: Option<&str>, port: Option<u64>) -> Option<String> {
    match (host, port) {
        (Some(host), Some(port)) => Some(format!("{host}:{port}")),
        (None, Some(port)) => Some(format!("127.0.0.1:{port}")),
        _ => None,
    }
}

fn normalize_legacy_virtualrouter_provider_runtime(value: &mut Value) -> Result<(), ConfigError> {
    let Some(root) = value.as_object_mut() else {
        return Ok(());
    };
    if user_provider_runtime_already_present(root) {
        return Ok(());
    }

    let selected = {
        let Some(virtualrouter) = root.get("virtualrouter").and_then(Value::as_object) else {
            return Ok(());
        };
        select_legacy_inline_provider(virtualrouter)?
    };

    let Some(selected) = selected else {
        return Ok(());
    };

    let provider_entry = root
        .entry("provider".to_string())
        .or_insert_with(|| json!({}));
    let Some(provider_obj) = provider_entry.as_object_mut() else {
        return Err(ConfigError::new(
            "invalid user config: `provider` must be an object when projecting legacy provider config",
        ));
    };
    let projected_runtime = build_legacy_provider_runtime_value(&selected)?;
    let runtime_entry = provider_obj
        .entry("runtime".to_string())
        .or_insert_with(|| json!({}));
    if !runtime_entry.is_object() {
        return Err(ConfigError::new(
            "invalid user config: `provider.runtime` must be an object when projecting legacy provider config",
        ));
    }
    *runtime_entry = merge_json(projected_runtime, runtime_entry.clone());

    Ok(())
}

fn normalize_legacy_virtualrouter_router_bootstrap(value: &mut Value) -> Result<(), ConfigError> {
    let Some(root) = value.as_object_mut() else {
        return Ok(());
    };
    if user_router_bootstrap_already_present(root) {
        return Ok(());
    }

    let routing = {
        let Some(virtualrouter) = root.get("virtualrouter").and_then(Value::as_object) else {
            return Ok(());
        };
        select_legacy_routing_source(virtualrouter)?.cloned()
    };

    let Some(routing) = routing else {
        return Ok(());
    };

    let router_entry = root
        .entry("router".to_string())
        .or_insert_with(|| json!({}));
    let Some(router_obj) = router_entry.as_object_mut() else {
        return Err(ConfigError::new(
            "invalid user config: `router` must be an object when projecting legacy routing config",
        ));
    };
    let bootstrap_entry = router_obj
        .entry("bootstrap".to_string())
        .or_insert_with(|| json!({}));
    let Some(bootstrap_obj) = bootstrap_entry.as_object_mut() else {
        return Err(ConfigError::new(
            "invalid user config: `router.bootstrap` must be an object when projecting legacy routing config",
        ));
    };

    bootstrap_obj.insert(
        "routes".to_string(),
        build_legacy_router_bootstrap_routes_value(&routing)?,
    );

    Ok(())
}

fn normalize_legacy_virtualrouter_provider_registry(value: &mut Value) -> Result<(), ConfigError> {
    let Some(root) = value.as_object_mut() else {
        return Ok(());
    };
    if user_provider_runtime_registry_already_present(root) {
        return Ok(());
    }

    let projected_registry = {
        let Some(virtualrouter) = root.get("virtualrouter").and_then(Value::as_object) else {
            return Ok(());
        };
        build_legacy_provider_runtime_registry_value(virtualrouter)?
    };

    let Some(projected_registry) = projected_registry else {
        return Ok(());
    };

    let provider_entry = root
        .entry("provider".to_string())
        .or_insert_with(|| json!({}));
    let Some(provider_obj) = provider_entry.as_object_mut() else {
        return Err(ConfigError::new(
            "invalid user config: `provider` must be an object when projecting legacy provider registry",
        ));
    };
    let runtime_entry = provider_obj
        .entry("runtime".to_string())
        .or_insert_with(|| json!({}));
    let Some(runtime_obj) = runtime_entry.as_object_mut() else {
        return Err(ConfigError::new(
            "invalid user config: `provider.runtime` must be an object when projecting legacy provider registry",
        ));
    };
    runtime_obj.insert("registry".to_string(), projected_registry);

    Ok(())
}

fn select_legacy_inline_provider(
    virtualrouter: &Map<String, Value>,
) -> Result<Option<LegacyInlineProvider>, ConfigError> {
    let Some(providers) = virtualrouter.get("providers").and_then(Value::as_object) else {
        return Ok(None);
    };

    let mut enabled = providers
        .iter()
        .filter_map(|(provider_id, provider)| {
            let record = provider.as_object()?;
            is_provider_enabled(record).then(|| LegacyInlineProvider {
                provider_id: provider_id.to_string(),
                provider: record.clone(),
            })
        })
        .collect::<Vec<_>>();

    match enabled.len() {
        0 => Ok(None),
        1 => Ok(enabled.pop()),
        _ => {
            let hinted = extract_legacy_provider_hint(virtualrouter)?;
            if let Some(provider_id) = hinted {
                if let Some(position) = enabled
                    .iter()
                    .position(|item| item.provider_id == provider_id)
                {
                    return Ok(Some(enabled.swap_remove(position)));
                }
                return Err(ConfigError::new(format!(
                    "legacy provider bootstrap hint `{provider_id}` does not match any enabled virtualrouter.providers entry"
                )));
            }

            Err(ConfigError::new(
                "multiple enabled legacy virtualrouter.providers entries found; add explicit provider.runtime or a default routing target hint",
            ))
        }
    }
}

fn is_provider_enabled(provider: &Map<String, Value>) -> bool {
    provider
        .get("enabled")
        .and_then(Value::as_bool)
        .unwrap_or(true)
}

fn extract_legacy_provider_hint(
    virtualrouter: &Map<String, Value>,
) -> Result<Option<String>, ConfigError> {
    Ok(select_legacy_routing_source(virtualrouter)?
        .and_then(|routing| routing.get("default"))
        .and_then(Value::as_array)
        .and_then(|rules| rules.first())
        .and_then(Value::as_object)
        .and_then(|rule| rule.get("targets"))
        .and_then(Value::as_array)
        .and_then(|targets| targets.first())
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(extract_provider_id_from_target))
}

fn select_legacy_routing_source<'a>(
    virtualrouter: &'a Map<String, Value>,
) -> Result<Option<&'a Map<String, Value>>, ConfigError> {
    if let Some(groups) = virtualrouter
        .get("routingPolicyGroups")
        .and_then(Value::as_object)
        .filter(|groups| !groups.is_empty())
    {
        let mut valid_groups = groups
            .iter()
            .filter_map(|(group_id, group)| {
                let group_id = group_id.trim();
                let group = group.as_object()?;
                (!group_id.is_empty()).then_some((group_id.to_string(), group))
            })
            .collect::<Vec<_>>();
        if valid_groups.is_empty() {
            return Ok(None);
        }

        let active_candidate = virtualrouter
            .get("activeRoutingPolicyGroup")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty());

        valid_groups.sort_by(|left, right| left.0.cmp(&right.0));

        let active_group = active_candidate
            .and_then(|candidate| valid_groups.iter().find(|(group_id, _)| group_id == candidate))
            .or_else(|| valid_groups.iter().find(|(group_id, _)| group_id == "default"))
            .or_else(|| valid_groups.first())
            .ok_or_else(|| {
                ConfigError::new(
                    "legacy routingPolicyGroups projection failed: no usable routing policy group found",
                )
            })?;

        let routing = active_group
            .1
            .get("routing")
            .and_then(Value::as_object)
            .ok_or_else(|| {
                ConfigError::new(format!(
                    "legacy routing policy group `{}` missing required object field `routing`",
                    active_group.0
                ))
            })?;

        return Ok(Some(routing));
    }

    Ok(virtualrouter.get("routing").and_then(Value::as_object))
}

fn build_legacy_router_bootstrap_routes_value(
    routing: &Map<String, Value>,
) -> Result<Value, ConfigError> {
    let mut routes = Map::new();

    for (route_name, pools) in routing {
        let route_name = route_name.trim();
        if route_name.is_empty() {
            return Err(ConfigError::new(
                "legacy routing projection failed: route name cannot be empty",
            ));
        }

        let pools = pools.as_array().ok_or_else(|| {
            ConfigError::new(format!(
                "legacy routing projection failed: route `{route_name}` must be an array of tiers"
            ))
        })?;
        let tier_count = pools.len();
        let mut normalized_pools = Vec::with_capacity(tier_count);
        for (index, pool) in pools.iter().enumerate() {
            normalized_pools.push(build_legacy_router_bootstrap_tier_value(
                route_name, index, tier_count, pool,
            )?);
        }
        routes.insert(route_name.to_string(), Value::Array(normalized_pools));
    }

    Ok(Value::Object(routes))
}

fn build_legacy_router_bootstrap_tier_value(
    route_name: &str,
    index: usize,
    tier_count: usize,
    pool: &Value,
) -> Result<Value, ConfigError> {
    let pool = pool.as_object().ok_or_else(|| {
        ConfigError::new(format!(
            "legacy routing projection failed: route `{route_name}` tier {} must be an object",
            index + 1
        ))
    })?;

    let tier_id = read_trimmed_string(pool, &["id"])
        .unwrap_or_else(|| format!("{route_name}.tier{}", index + 1));
    let targets = pool
        .get("targets")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            ConfigError::new(format!(
                "legacy routing projection failed: route `{route_name}` tier `{tier_id}` missing array field `targets`"
            ))
        })?
        .iter()
        .filter_map(|value| {
            value
                .as_str()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .collect::<Vec<_>>();
    if targets.is_empty() {
        return Err(ConfigError::new(format!(
            "legacy routing projection failed: route `{route_name}` tier `{tier_id}` requires at least one non-empty target"
        )));
    }

    let derived_priority = i32::try_from(tier_count.saturating_sub(index)).unwrap_or(1);
    let priority = read_priority_i32(pool).unwrap_or(derived_priority);

    Ok(json!({
        "id": tier_id,
        "targets": targets,
        "priority": priority,
    }))
}

fn extract_provider_id_from_target(target: &str) -> String {
    target
        .split_once('.')
        .map(|(provider_id, _)| provider_id)
        .unwrap_or(target)
        .trim()
        .to_string()
}

fn build_legacy_provider_runtime_value(
    selected: &LegacyInlineProvider,
) -> Result<Value, ConfigError> {
    let transport = build_legacy_transport_provider_value(selected)?;

    Ok(json!({
        "kind": "transport",
        "transport": transport,
    }))
}

fn build_legacy_transport_provider_value(
    selected: &LegacyInlineProvider,
) -> Result<Value, ConfigError> {
    let provider_type = read_trimmed_string(&selected.provider, &["type"]).ok_or_else(|| {
        ConfigError::new(format!(
            "legacy provider `{}` missing required field `type`",
            selected.provider_id
        ))
    })?;
    let base_url = resolve_env_placeholders(
        &read_trimmed_string(&selected.provider, &["baseURL", "base_url"]).ok_or_else(|| {
            ConfigError::new(format!(
                "legacy provider `{}` missing required field `baseURL/base_url`",
                selected.provider_id
            ))
        })?,
    )?;
    let endpoint = resolve_env_placeholders(&resolve_legacy_provider_endpoint(
        &provider_type,
        &selected.provider,
        &selected.provider_id,
    )?)?;

    let timeout_ms = read_timeout_u64(&selected.provider, &["timeout_ms", "timeoutMs"]);
    let auth = build_legacy_provider_auth_value(
        &provider_type,
        selected.provider.get("auth").and_then(Value::as_object),
        &selected.provider_id,
    )?;
    let headers = build_legacy_provider_headers_value(&provider_type)?;

    let mut transport = Map::new();
    transport.insert("base_url".to_string(), Value::String(base_url));
    transport.insert("endpoint".to_string(), Value::String(endpoint));
    if let Some(timeout_ms) = timeout_ms {
        transport.insert(
            "timeout_ms".to_string(),
            Value::Number(serde_json::Number::from(timeout_ms)),
        );
    }
    if let Some(auth) = auth {
        transport.insert("auth".to_string(), Value::Object(auth));
    }
    if let Some(headers) = headers {
        transport.insert("headers".to_string(), Value::Object(headers));
    }

    Ok(Value::Object(transport))
}

fn build_legacy_provider_runtime_registry_value(
    virtualrouter: &Map<String, Value>,
) -> Result<Option<Value>, ConfigError> {
    let Some(providers) = virtualrouter.get("providers").and_then(Value::as_object) else {
        return Ok(None);
    };
    let Some(routing) = select_legacy_routing_source(virtualrouter)? else {
        return Ok(None);
    };

    let active_targets = collect_active_routing_targets(routing)?;
    if active_targets.is_empty() {
        return Ok(None);
    }

    let mut transports = Map::new();
    for target in active_targets {
        let provider_id = extract_provider_id_from_target(&target);
        let provider = providers
            .get(&provider_id)
            .and_then(Value::as_object)
            .ok_or_else(|| {
                ConfigError::new(format!(
                    "legacy provider registry projection failed: target `{target}` references unknown virtualrouter.providers entry `{provider_id}`"
                ))
            })?;
        if !is_provider_enabled(provider) {
            return Err(ConfigError::new(format!(
                "legacy provider registry projection failed: target `{target}` references disabled virtualrouter.providers entry `{provider_id}`"
            )));
        }

        let legacy_provider = LegacyInlineProvider {
            provider_id,
            provider: provider.clone(),
        };
        transports.insert(
            target,
            build_legacy_transport_provider_value(&legacy_provider)?,
        );
    }

    Ok(Some(json!({
        "transports": Value::Object(transports),
    })))
}

fn collect_active_routing_targets(
    routing: &Map<String, Value>,
) -> Result<Vec<String>, ConfigError> {
    let mut targets = BTreeSet::new();

    for (route_name, pools) in routing {
        let pools = pools.as_array().ok_or_else(|| {
            ConfigError::new(format!(
                "legacy routing projection failed: route `{}` must be an array of tiers",
                route_name.trim()
            ))
        })?;
        for (index, pool) in pools.iter().enumerate() {
            let pool = pool.as_object().ok_or_else(|| {
                ConfigError::new(format!(
                    "legacy routing projection failed: route `{}` tier {} must be an object",
                    route_name.trim(),
                    index + 1
                ))
            })?;
            let route_targets = pool
                .get("targets")
                .and_then(Value::as_array)
                .ok_or_else(|| {
                    ConfigError::new(format!(
                        "legacy routing projection failed: route `{}` tier {} missing array field `targets`",
                        route_name.trim(),
                        index + 1
                    ))
                })?;
            for target in route_targets.iter().filter_map(Value::as_str) {
                let target = target.trim();
                if !target.is_empty() {
                    targets.insert(target.to_string());
                }
            }
        }
    }

    Ok(targets.into_iter().collect())
}

fn resolve_legacy_provider_endpoint(
    provider_type: &str,
    provider: &Map<String, Value>,
    provider_id: &str,
) -> Result<String, ConfigError> {
    if let Some(endpoint) = read_trimmed_string(provider, &["endpoint"]) {
        return Ok(endpoint);
    }
    if let Some(endpoint) = provider
        .get("responses")
        .and_then(Value::as_object)
        .and_then(|responses| read_trimmed_string(responses, &["endpoint"]))
    {
        return Ok(endpoint);
    }
    if let Some(endpoint) = provider
        .get("config")
        .and_then(Value::as_object)
        .and_then(|config| config.get("responses"))
        .and_then(Value::as_object)
        .and_then(|responses| read_trimmed_string(responses, &["endpoint"]))
    {
        return Ok(endpoint);
    }

    match provider_type.trim() {
        "responses" | "openai" | "openai-standard" => Ok("/responses".to_string()),
        "anthropic" => Ok("/v1/messages".to_string()),
        other => Err(ConfigError::new(format!(
            "legacy provider `{provider_id}` uses unsupported transport-compatible type `{other}`; Batch 02 only supports responses/openai/openai-standard/anthropic"
        ))),
    }
}

fn build_legacy_provider_auth_value(
    provider_type: &str,
    auth: Option<&Map<String, Value>>,
    provider_id: &str,
) -> Result<Option<Map<String, Value>>, ConfigError> {
    let Some(auth) = auth else {
        return Ok(None);
    };

    let auth_type = read_trimmed_string(auth, &["type"]).unwrap_or_else(|| "apikey".to_string());
    match auth_type.as_str() {
        "apikey" => {
            let mut result = Map::new();
            result.insert("type".to_string(), Value::String("apikey".to_string()));
            result.insert(
                "api_key".to_string(),
                Value::String(resolve_env_placeholders(
                    &read_trimmed_string(auth, &["apiKey", "api_key"]).unwrap_or_default(),
                )?),
            );
            if let Some(header_name) = read_trimmed_string(auth, &["headerName", "header_name"])
                .or_else(|| default_legacy_provider_auth_header_name(provider_type))
            {
                result.insert(
                    "header_name".to_string(),
                    Value::String(resolve_env_placeholders(&header_name)?),
                );
            }
            if let Some(prefix) = read_trimmed_string(auth, &["prefix"])
                .or_else(|| default_legacy_provider_auth_prefix(provider_type))
            {
                result.insert(
                    "prefix".to_string(),
                    Value::String(resolve_env_placeholders(&prefix)?),
                );
            }
            Ok(Some(result))
        }
        "none" | "noauth" | "no-auth" => Ok(Some(Map::from_iter([(
            "type".to_string(),
            Value::String("apikey".to_string()),
        )]))),
        other => Err(ConfigError::new(format!(
            "legacy provider `{provider_id}` uses unsupported auth type `{other}` for provider type `{provider_type}`; Batch 02 only supports apikey|none"
        ))),
    }
}

fn build_legacy_provider_headers_value(
    provider_type: &str,
) -> Result<Option<Map<String, Value>>, ConfigError> {
    match provider_type.trim() {
        "anthropic" => Ok(Some(Map::from_iter([(
            "anthropic-version".to_string(),
            Value::String(DEFAULT_ANTHROPIC_VERSION.to_string()),
        )]))),
        "responses" | "openai" | "openai-standard" => Ok(None),
        other => Err(ConfigError::new(format!(
            "legacy provider headers projection does not support provider type `{other}`"
        ))),
    }
}

fn default_legacy_provider_auth_header_name(provider_type: &str) -> Option<String> {
    match provider_type.trim() {
        "anthropic" => Some("x-api-key".to_string()),
        _ => None,
    }
}

fn default_legacy_provider_auth_prefix(provider_type: &str) -> Option<String> {
    match provider_type.trim() {
        "anthropic" => Some(String::new()),
        _ => None,
    }
}

fn resolve_env_placeholders(input: &str) -> Result<String, ConfigError> {
    let mut output = String::new();
    let mut rest = input;

    while let Some(start) = rest.find("${") {
        output.push_str(&rest[..start]);
        let placeholder_tail = &rest[start + 2..];
        let Some(end) = placeholder_tail.find('}') else {
            return Err(ConfigError::new(format!(
                "invalid env placeholder syntax: missing `}}` in `{input}`"
            )));
        };
        let expr = &placeholder_tail[..end];
        output.push_str(&resolve_single_env_placeholder(expr)?);
        rest = &placeholder_tail[end + 1..];
    }

    output.push_str(rest);
    Ok(output)
}

fn resolve_single_env_placeholder(expr: &str) -> Result<String, ConfigError> {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return Err(ConfigError::new(
            "invalid env placeholder syntax: empty variable name",
        ));
    }

    let (name, default) = if let Some((name, default)) = trimmed.split_once(":-") {
        (name.trim(), Some(default))
    } else {
        (trimmed, None)
    };

    if name.is_empty() {
        return Err(ConfigError::new(
            "invalid env placeholder syntax: empty variable name",
        ));
    }

    match env::var(name) {
        Ok(value) if !value.trim().is_empty() => Ok(value),
        _ => match default {
            Some(default) => Ok(default.to_string()),
            None => Err(ConfigError::new(format!(
                "missing environment variable `{name}` required by legacy config placeholder"
            ))),
        },
    }
}

fn user_provider_runtime_already_present(root: &Map<String, Value>) -> bool {
    root.get("provider")
        .and_then(Value::as_object)
        .and_then(|provider| provider.get("runtime"))
        .and_then(Value::as_object)
        .and_then(|runtime| runtime.get("kind"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .is_some()
}

fn user_router_bootstrap_already_present(root: &Map<String, Value>) -> bool {
    match root.get("router") {
        Some(Value::Object(router)) => match router.get("bootstrap") {
            Some(Value::Object(bootstrap)) => bootstrap.contains_key("routes"),
            Some(_) => true,
            None => false,
        },
        Some(_) => true,
        None => false,
    }
}

fn user_provider_runtime_registry_already_present(root: &Map<String, Value>) -> bool {
    root.get("provider")
        .and_then(Value::as_object)
        .and_then(|provider| provider.get("runtime"))
        .and_then(Value::as_object)
        .and_then(|runtime| runtime.get("registry"))
        .map(|registry| match registry {
            Value::Object(registry) => registry.contains_key("transports"),
            _ => true,
        })
        .unwrap_or(false)
}

fn read_trimmed_string(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn read_timeout_u64(record: &Map<String, Value>, keys: &[&str]) -> Option<u64> {
    keys.iter()
        .filter_map(|key| record.get(*key))
        .find_map(|value| match value {
            Value::Number(number) => number
                .as_u64()
                .or_else(|| number.as_i64().map(|value| value.max(0) as u64)),
            _ => None,
        })
}

fn read_priority_i32(record: &Map<String, Value>) -> Option<i32> {
    record.get("priority").and_then(|value| match value {
        Value::Number(number) => number.as_i64().and_then(|value| i32::try_from(value).ok()),
        _ => None,
    })
}

#[derive(Debug, Clone)]
struct LegacyInlineProvider {
    provider_id: String,
    provider: Map<String, Value>,
}

fn merge_json(base: Value, overlay: Value) -> Value {
    match (base, overlay) {
        (Value::Object(base), Value::Object(overlay)) => {
            Value::Object(merge_object_maps(base, overlay))
        }
        (_, overlay) => overlay,
    }
}

fn merge_object_maps(
    mut base: Map<String, Value>,
    overlay: Map<String, Value>,
) -> Map<String, Value> {
    for (key, overlay_value) in overlay {
        match base.remove(&key) {
            Some(base_value) => {
                base.insert(key, merge_json(base_value, overlay_value));
            }
            None => {
                base.insert(key, overlay_value);
            }
        }
    }
    base
}

fn resolve_rcc_user_dir_with_home_override(home_override: Option<&Path>) -> PathBuf {
    for key in USER_DIR_ENV_KEYS {
        if let Some(value) = env::var(key).ok().as_deref().and_then(trimmed_non_empty) {
            let candidate = resolve_candidate_path(value, home_override);
            if candidate != resolve_legacy_routecodex_user_dir(home_override) {
                return candidate;
            }
        }
    }

    resolve_home_dir(home_override).join(DEFAULT_USER_DIR_NAME)
}

fn resolve_default_user_config_path(home_override: Option<&Path>) -> PathBuf {
    resolve_rcc_user_dir_with_home_override(home_override).join(DEFAULT_USER_CONFIG_FILE_NAME)
}

fn resolve_legacy_routecodex_user_dir(home_override: Option<&Path>) -> PathBuf {
    resolve_home_dir(home_override).join(LEGACY_USER_DIR_NAME)
}

fn resolve_candidate_path(raw: &str, home_override: Option<&Path>) -> PathBuf {
    let expanded = expand_home(raw, home_override);
    let path = PathBuf::from(expanded);
    if path.is_absolute() {
        path
    } else {
        safe_current_dir(home_override).join(path)
    }
}

fn safe_current_dir(home_override: Option<&Path>) -> PathBuf {
    env::current_dir().unwrap_or_else(|_| resolve_home_dir(home_override))
}

fn expand_home(raw: &str, home_override: Option<&Path>) -> PathBuf {
    if raw == "~" {
        return resolve_home_dir(home_override);
    }
    if let Some(suffix) = raw.strip_prefix("~/") {
        return resolve_home_dir(home_override).join(suffix);
    }
    PathBuf::from(raw)
}

fn resolve_home_dir(home_override: Option<&Path>) -> PathBuf {
    if let Some(explicit) = home_override {
        return explicit.to_path_buf();
    }
    if let Some(value) = env::var_os("HOME") {
        let path = PathBuf::from(value);
        if !path.as_os_str().is_empty() {
            return path;
        }
    }
    PathBuf::from("/")
}

fn trimmed_non_empty(value: &str) -> Option<&str> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then_some(trimmed)
}

#[cfg(test)]
mod tests {
    use super::{
        load_config, resolve_candidate_path, resolve_default_user_config_path,
        resolve_env_placeholders, ConfigPathSource, ProviderRuntimeKind,
    };
    use std::fs;
    use std::path::{Path, PathBuf};

    #[test]
    fn load_config_uses_bundled_user_template_when_user_file_is_missing() {
        let path = unique_test_path("missing-config.json");
        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert!(loaded.uses_bundled_user_config());
        assert_eq!(loaded.user_config_path_source, ConfigPathSource::Explicit);
        assert_eq!(loaded.resolved_user_config_path, path);
        assert_eq!(loaded.effective.host.server.addr, "127.0.0.1:38080");
        assert_eq!(loaded.effective.host.defaults.smoke.operation, "smoke");
        assert_eq!(loaded.effective.host.defaults.chat.operation, "chat");
        assert_eq!(
            loaded.effective.provider.runtime.kind,
            ProviderRuntimeKind::Noop
        );
        assert!(loaded.effective.router.bootstrap.routes.is_empty());
    }

    #[test]
    fn load_config_merges_explicit_user_override_over_system_defaults() {
        let path = unique_test_path("override-config.json");
        write_text(
            &path,
            r#"{
  "host": {
    "server": {
      "addr": "127.0.0.1:48123"
    },
    "defaults": {
      "smoke": {
        "payload": "phase11-user-override"
      }
    }
  },
  "provider": {
    "runtime": {
      "kind": "transport",
      "transport": {
        "base_url": "http://127.0.0.1:39090"
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert!(!loaded.uses_bundled_user_config());
        assert_eq!(loaded.user_config_path_source, ConfigPathSource::Explicit);
        assert_eq!(loaded.effective.host.server.addr, "127.0.0.1:48123");
        assert_eq!(
            loaded.effective.host.defaults.smoke.payload,
            "phase11-user-override"
        );
        assert_eq!(loaded.effective.host.defaults.chat.operation, "chat");
        assert_eq!(
            loaded.effective.provider.runtime.kind,
            ProviderRuntimeKind::Transport
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.base_url,
            "http://127.0.0.1:39090"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.endpoint,
            "/v1/responses"
        );
        assert!(loaded.effective.router.bootstrap.routes.is_empty());
    }

    #[test]
    fn load_config_normalizes_legacy_httpserver_into_host_addr() {
        let path = unique_test_path("legacy-httpserver-config.json");
        write_text(
            &path,
            r#"{
  "version": "1.0.0",
  "httpserver": {
    "host": "0.0.0.0",
    "port": 5520
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(loaded.effective.host.server.addr, "0.0.0.0:5520");
        assert_eq!(loaded.effective.host.defaults.smoke.operation, "smoke");
    }

    #[test]
    fn load_config_projects_legacy_routing_into_router_bootstrap() {
        let path = unique_test_path("legacy-routing-config.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "id": "default-primary",
          "targets": ["openai.gpt-5.2"]
        },
        {
          "targets": ["anthropic.claude-3.7"]
        }
      ],
      "tools": [
        {
          "targets": ["openai.tools.gpt-5"]
        }
      ]
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        let default_route = loaded
            .effective
            .router
            .bootstrap
            .routes
            .get("default")
            .expect("default route");
        assert_eq!(default_route.len(), 2);
        assert_eq!(default_route[0].id, "default-primary");
        assert_eq!(default_route[0].targets, vec!["openai.gpt-5.2".to_string()]);
        assert_eq!(default_route[0].priority, 2);
        assert_eq!(default_route[1].id, "default.tier2");
        assert_eq!(
            default_route[1].targets,
            vec!["anthropic.claude-3.7".to_string()]
        );
        assert_eq!(default_route[1].priority, 1);
        assert_eq!(
            loaded.effective.router.bootstrap.routes["tools"][0].targets,
            vec!["openai.tools.gpt-5".to_string()]
        );
    }

    #[test]
    fn load_config_projects_active_routing_policy_group_into_router_bootstrap() {
        let path = unique_test_path("legacy-routing-policy-groups-config.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "activeRoutingPolicyGroup": "canary",
    "routingPolicyGroups": {
      "default": {
        "routing": {
          "default": [
            {
              "targets": ["openai.gpt-5.2"]
            }
          ]
        }
      },
      "canary": {
        "routing": {
          "default": [
            {
              "id": "canary-primary",
              "targets": ["beta.gpt-5.3"],
              "priority": 50
            }
          ],
          "thinking": [
            {
              "targets": ["beta.reasoning.gpt-5.3"]
            }
          ]
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.router.bootstrap.routes["default"][0].targets,
            vec!["beta.gpt-5.3".to_string()]
        );
        assert_eq!(
            loaded.effective.router.bootstrap.routes["default"][0].id,
            "canary-primary"
        );
        assert_eq!(
            loaded.effective.router.bootstrap.routes["default"][0].priority,
            50
        );
        assert_eq!(
            loaded.effective.router.bootstrap.routes["thinking"][0].targets,
            vec!["beta.reasoning.gpt-5.3".to_string()]
        );
    }

    #[test]
    fn load_config_projects_single_legacy_provider_into_transport_runtime() {
        let path = unique_test_path("legacy-provider-config.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "providers": {
      "openai": {
        "id": "openai",
        "enabled": true,
        "type": "openai",
        "baseURL": "https://api.openai.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "${PHASE11_MISSING_OPENAI_KEY_FOR_TEST:-sk-phase11}"
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.provider.runtime.kind,
            ProviderRuntimeKind::Transport
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.base_url,
            "https://api.openai.com/v1"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.endpoint,
            "/responses"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.auth.api_key,
            "sk-phase11"
        );
    }

    #[test]
    fn load_config_projects_single_legacy_anthropic_provider_into_transport_runtime() {
        let path = unique_test_path("legacy-anthropic-provider-config.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "providers": {
      "anthropic": {
        "id": "anthropic",
        "enabled": true,
        "type": "anthropic",
        "baseURL": "https://api.anthropic.com",
        "auth": {
          "type": "apikey",
          "apiKey": "${PHASE11_MISSING_ANTHROPIC_KEY_FOR_TEST:-sk-anthropic}"
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.provider.runtime.kind,
            ProviderRuntimeKind::Transport
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.base_url,
            "https://api.anthropic.com"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.endpoint,
            "/v1/messages"
        );
        assert_eq!(
            loaded
                .effective
                .provider
                .runtime
                .transport
                .auth
                .header_name
                .as_deref(),
            Some("x-api-key")
        );
        assert_eq!(
            loaded
                .effective
                .provider
                .runtime
                .transport
                .auth
                .prefix
                .as_deref(),
            Some("")
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.headers["anthropic-version"],
            "2023-06-01"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.auth.api_key,
            "sk-anthropic"
        );
    }

    #[test]
    fn load_config_projects_legacy_provider_using_default_route_hint() {
        let path = unique_test_path("legacy-provider-hint-config.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "providers": {
      "alpha": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://alpha.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-alpha"
        }
      },
      "beta": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://beta.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-beta"
        }
      }
    },
    "routing": {
      "default": [
        {
          "targets": ["beta.gpt-5"]
        }
      ]
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.provider.runtime.transport.base_url,
            "https://beta.example.com/v1"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.auth.api_key,
            "sk-beta"
        );
    }

    #[test]
    fn load_config_projects_legacy_provider_using_active_routing_policy_group_hint() {
        let path = unique_test_path("legacy-provider-policy-group-hint-config.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "activeRoutingPolicyGroup": "canary",
    "routingPolicyGroups": {
      "default": {
        "routing": {
          "default": [
            {
              "targets": ["alpha.gpt-5"]
            }
          ]
        }
      },
      "canary": {
        "routing": {
          "default": [
            {
              "targets": ["beta.gpt-5"]
            }
          ]
        }
      }
    },
    "providers": {
      "alpha": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://alpha.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-alpha"
        }
      },
      "beta": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://beta.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-beta"
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.provider.runtime.transport.base_url,
            "https://beta.example.com/v1"
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.auth.api_key,
            "sk-beta"
        );
    }

    #[test]
    fn load_config_keeps_explicit_router_bootstrap_over_legacy_projection() {
        let path = unique_test_path("explicit-router-overrides-legacy.json");
        write_text(
            &path,
            r#"{
  "router": {
    "bootstrap": {
      "routes": {
        "default": [
          {
            "id": "typed-default",
            "targets": ["typed.gpt-5"],
            "priority": 7
          }
        ]
      }
    }
  },
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "targets": ["legacy.gpt-5"]
        }
      ]
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.router.bootstrap.routes["default"][0].id,
            "typed-default"
        );
        assert_eq!(
            loaded.effective.router.bootstrap.routes["default"][0].targets,
            vec!["typed.gpt-5".to_string()]
        );
        assert_eq!(
            loaded.effective.router.bootstrap.routes["default"][0].priority,
            7
        );
    }

    #[test]
    fn load_config_keeps_explicit_provider_runtime_over_legacy_projection() {
        let path = unique_test_path("explicit-provider-overrides-legacy.json");
        write_text(
            &path,
            r#"{
  "provider": {
    "runtime": {
      "kind": "noop"
    }
  },
  "virtualrouter": {
    "providers": {
      "openai": {
        "enabled": true,
        "type": "openai",
        "baseURL": "https://api.openai.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-legacy"
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");

        assert_eq!(
            loaded.effective.provider.runtime.kind,
            ProviderRuntimeKind::Noop
        );
        assert_eq!(
            loaded.effective.provider.runtime.transport.base_url,
            "http://127.0.0.1:1234"
        );
    }

    #[test]
    fn load_config_projects_legacy_provider_targets_into_runtime_registry() {
        let path = unique_test_path("legacy-provider-registry-projection.json");
        write_text(
            &path,
            r#"{
  "virtualrouter": {
    "activeRoutingPolicyGroup": "default",
    "routingPolicyGroups": {
      "default": {
        "routing": {
          "default": [
            {
              "targets": ["alpha.gpt-5"]
            }
          ],
          "multimodal": [
            {
              "targets": ["beta.vision.gpt-4o"]
            }
          ]
        }
      }
    },
    "providers": {
      "alpha": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://alpha.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-alpha"
        }
      },
      "beta": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://beta.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-beta"
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");
        let registry = &loaded.effective.provider.runtime.registry.transports;

        assert_eq!(
            registry["alpha.gpt-5"].base_url,
            "https://alpha.example.com/v1"
        );
        assert_eq!(registry["alpha.gpt-5"].auth.api_key, "sk-alpha");
        assert_eq!(
            registry["beta.vision.gpt-4o"].base_url,
            "https://beta.example.com/v1"
        );
        assert_eq!(registry["beta.vision.gpt-4o"].auth.api_key, "sk-beta");
    }

    #[test]
    fn load_config_derives_provider_families_from_transport_endpoints() {
        let path = unique_test_path("provider-family-hints.json");
        write_text(
            &path,
            r#"{
  "provider": {
    "runtime": {
      "transport": {
        "base_url": "https://anthropic.example.com",
        "endpoint": "/v1/messages",
        "timeout_ms": 30000,
        "auth": {
          "type": "apikey",
          "api_key": "sk-default",
          "header_name": "x-api-key",
          "prefix": ""
        }
      },
      "registry": {
        "transports": {
          "alias.responses": {
            "base_url": "https://openai.example.com/v1",
            "endpoint": "/v1/responses",
            "timeout_ms": 30000,
            "auth": {
              "type": "apikey",
              "api_key": "sk-responses"
            }
          },
          "alias.anthropic": {
            "base_url": "https://anthropic.example.com",
            "endpoint": "/v1/messages",
            "timeout_ms": 30000,
            "auth": {
              "type": "apikey",
              "api_key": "sk-anthropic",
              "header_name": "x-api-key",
              "prefix": ""
            }
          }
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");
        let families = loaded
            .effective
            .provider
            .runtime
            .registry_transport_provider_families();

        assert_eq!(
            loaded
                .effective
                .provider
                .runtime
                .transport_provider_family(),
            Some("anthropic")
        );
        assert_eq!(
            families.get("alias.responses").map(String::as_str),
            Some("responses")
        );
        assert_eq!(
            families.get("alias.anthropic").map(String::as_str),
            Some("anthropic")
        );
    }

    #[test]
    fn load_config_keeps_explicit_runtime_registry_over_legacy_projection() {
        let path = unique_test_path("explicit-provider-registry-overrides-legacy.json");
        write_text(
            &path,
            r#"{
  "provider": {
    "runtime": {
      "registry": {
        "transports": {
          "typed.gpt-5": {
            "base_url": "https://typed.example.com/v1",
            "endpoint": "/responses",
            "timeout_ms": 30000,
            "auth": {
              "type": "apikey",
              "api_key": "sk-typed"
            }
          }
        }
      }
    }
  },
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "targets": ["legacy.gpt-5"]
        }
      ]
    },
    "providers": {
      "legacy": {
        "enabled": true,
        "type": "responses",
        "baseURL": "https://legacy.example.com/v1",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-legacy"
        }
      }
    }
  }
}"#,
        );

        let loaded = load_config(Some(path.to_str().expect("path str"))).expect("load config");
        let registry = &loaded.effective.provider.runtime.registry.transports;

        assert_eq!(registry.len(), 1);
        assert_eq!(
            registry["typed.gpt-5"].base_url,
            "https://typed.example.com/v1"
        );
    }

    #[test]
    fn resolve_env_placeholders_supports_default_empty_value() {
        let resolved = resolve_env_placeholders("Bearer ${MISSING_PHASE11_KEY:-}")
            .expect("resolve env placeholders");

        assert_eq!(resolved, "Bearer ");
    }

    #[test]
    fn resolve_default_user_config_path_ends_with_config_json() {
        let resolved = resolve_default_user_config_path(None);

        assert!(resolved.ends_with("config.json"));
    }

    #[test]
    fn resolve_candidate_path_expands_home_prefix() {
        let home = unique_test_path("fake-home");
        let resolved = resolve_candidate_path("~/custom/config.json", Some(&home));

        assert_eq!(resolved, home.join("custom").join("config.json"));
    }

    fn unique_test_path(name: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        std::env::temp_dir().join(format!("rcc-core-config-{nanos}-{name}"))
    }

    fn write_text(path: &Path, text: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("create test parent");
        }
        fs::write(path, text).expect("write test file");
    }
}
