
// Parses env against default configuration
// if env_to_json is not provided, it is assumed that config keys are the
// names of the env variables
function parse_env(config, env_to_json = null) {
    if (!env_to_json) {
        env_to_json = {}
        for (const [key, _] of Object.entries(config)) {
            env_to_json[key] = key
        }
    }
    for (const [env_var, json_var] of Object.entries(env_to_json)) {
        if (process.env[env_var]) {
            let val = process.env[env_var]
            let fieldType = typeof (config[json_var])
            if (fieldType === "number") {
                val = Number(val)
            }
            else if (fieldType === "boolean") {
                val = (val === 'true')
            }
            config[json_var] = val
        }
    }
    return config
}

module.exports = parse_env