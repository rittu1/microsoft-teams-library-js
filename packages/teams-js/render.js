const Mustache = require('mustache');
var fs = require('fs');

function get(file) {
    return fs.readFileSync(file).toString();
}

var data = JSON.parse(get('./tools/capabilityJson/geoLocation.json'));

var template = get('./tools/mustacheTemplates/capability.mustache');

var partials = {
    interface: get('./tools/mustacheTemplates/interface.mustache'),
    returnFunction: get('./tools/mustacheTemplates/returnFunction.mustache'),
    fireAndForgetFunction: get('./tools/mustacheTemplates/fireAndForgetFunction.mustache'),
    parameterList: get('./tools/mustacheTemplates/parameterList.mustache'),
    functionComment: get('./tools/mustacheTemplates/functionComment.mustache'),
    functionValidation: get('./tools/mustacheTemplates/functionValidation.mustache'),
    namespace: get('./tools/mustacheTemplates/namespace.mustache'),
    subcapability: get('./tools/mustacheTemplates/subcapability.mustache'),
};

// This looks a bit silly, but lets mustache format comma separate lists correctly without requiring
// json authors to go remember to put `"last": true` on the last item in each parameter list.
data.exportedReturnFunctions.forEach(entry => {
    if (entry.parameters !== undefined) {
        entry.parameters[entry.parameters.length - 1].last = true;
    }
});

data.exportedFireAndForgetFunctions.forEach(entry => {
    if (entry.parameters !== undefined) {
        entry.parameters[entry.parameters.length - 1].last = true;
    }
});

function buildUpOtherRequiredCapabilities(jsonObject, needsToBeSupported, currentCapability = undefined) {
    var capabilityName = currentCapability ? `${currentCapability}.${jsonObject.capabilityName}` : jsonObject.capabilityName;
    needsToBeSupported.push(capabilityName);
    // Make a copy of the array so we don't end up with identical arrays for each subcapability
    jsonObject.needsToBeSupported = [...needsToBeSupported];
    if (jsonObject.subcapabilities) {
        jsonObject.subcapabilities.forEach(subcapability => {
            buildUpOtherRequiredCapabilities(subcapability, needsToBeSupported, capabilityName)
        });
    }
}

buildUpOtherRequiredCapabilities(data, [], undefined);

// Uncomment if you want to see what we turn the data into after processing it and before using it to
// render mustache templates
// process.stdout.write(JSON.stringify(data));

process.stdout.write(Mustache.render(template, data, partials));