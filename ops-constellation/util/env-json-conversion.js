// one function for env to json
// one function for json to env
const { ArgumentParser } = require('argparse');
const fs = require('fs')

const parser = new ArgumentParser({
    description: 'arguments for serializing and deserializing json files to and from env variables. \
    Json to env will output the env variable to stdout which the user should capture. Env to json will \
    save the json will in the specific output directory.'
});

parser.add_argument('-d', '--direction', { choices: ['e2j', 'j2e'], help: 'convert from env variable to json or json to env variable' });
parser.add_argument('-i', '--input_file', { help: 'Input directory of the json to be serialized and captured in an env variable' })
parser.add_argument('-e', '--env_variable', { help: 'The name of the env variable to be parsed' })
parser.add_argument('-o', '--output_file', { help: 'the output directory of env to json conversion. Only applicable with e2j mode' })
args = parser.parse_args()

function converter() {
    if (args['direction'] === 'e2j') {
        const env_variable = process.env[args['env_variable']]
        if (env_variable && args['output_file']) {
            fs.writeFile(args['output_file'], env_variable, (err) => {
                if (err) throw err;
            })
        }
        else {
            console.error('Empty env variable')
        }
    }
    else if (args['direction'] == 'j2e') {
        try {
            const data = fs.readFileSync(args['input_file'], 'utf8');
            const parsed_data = JSON.parse(data)
            console.log(JSON.stringify(parsed_data, null, 2))
        } catch (err) {
            console.error(err);
        }
    }

}

converter()