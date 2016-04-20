AJS.bind("init.rte", function () {
    var ajaxProjects = function (input, name, values) {
        AJS.$.ajax(contextPath + '/rest/jirasearch/latest/utils/projects', {
            timeout: 10000, dataType: 'json', type: 'GET', async: false, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-Atlassian-Token", "nocheck");
            },
            success: function (result) {
                AJS.$.each(result, function (index, project) {
                    input.append('<option value="' + project.key + '">' + project.name + '</option>');
                });
            }, contentType: 'application/json'});
    };

    var ajaxIssueTypes = function (input, name, values) {
        AJS.$.ajax(contextPath + '/rest/jirasearch/latest/utils/issueTypes', {
            timeout: 10000, dataType: 'json', type: 'GET', async: false, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-Atlassian-Token", "nocheck");
            },
            success: function (result) {
                AJS.$.each(result, function (index, issuetype) {
                    input.append('<option value="' + issuetype.name + '">' + issuetype.name + '</option>');
                });
            }, contentType: 'application/json'});
    };

    var jsOverrides = {
        "select2Functions": {},
        "beforeParamsSet": function (params) {
            AJS.$.each(jsOverrides['select2Functions'], function (paramName, func) {
                func(paramName, params[paramName]);
            });
            return params;
        },
        "fields": {
            "enum": {
                "project": function (param, options) {
                    var field = AJS.MacroBrowser.ParameterFields["enum"](param, options);
                    ajaxProjects(field.input, param.name);

                    var projFunc = function (paramName, project) {
                        //When using Select2, the previously selected item does not show up as selected. This is a workaround
                        //that is run by beforeParamsSet when it knows the value of the field.
                        var field = AJS.MacroBrowser.fields[paramName];
                        // field.paramDiv.find('select option[value=""]').first().remove(); // Remove the default empty element of the select.
                        var selected = field.paramDiv.find('select option[value="' + project + '"]');
                        if (selected.length > 0) {
                            selected.attr('selected', 'selected');
                        }
                        else if (project) {
                            // Previously selected value not in REST response, therefore adding it manually but marking it unavailable.
                            field.paramDiv.find('select').append('<option selected="selected" value="' + project + '">(Unavailable) ' + project + '</option>');
                        }
                        field.input.auiSelect2();
                    };
                    jsOverrides["select2Functions"][param.name] = projFunc;
                    return field;
                },
                "issueType": function (param, options) {
                    var field = AJS.MacroBrowser.ParameterFields["enum"](param, options);
                    ajaxIssueTypes(field.input, param.name);

                    var issueTypeFunc = function (paramName, issuetype) {
                        //When using Select2, the previously selected item does not show up as selected. This is a workaround
                        //that is run by beforeParamsSet when it knows the value of the field.
                        var field = AJS.MacroBrowser.fields[paramName];
                        // field.paramDiv.find('select option[value=""]').first().remove(); // Remove the default empty element of the select.
                        var selected = field.paramDiv.find('select option[value="' + issuetype + '"]');
                        if (selected.length > 0) {
                            selected.attr('selected', 'selected');
                        }
                        else if (issuetype) {
                            // Previously selected value not in REST response, therefore adding it manually but marking it unavailable.
                            field.paramDiv.find('select').append('<option selected="selected" value="' + issuetype + '">(Unavailable) ' + issuetype + '</option>');
                        }
                        field.input.auiSelect2();
                    };
                    jsOverrides["select2Functions"][param.name] = issueTypeFunc;
                    return field;
                }
            }
        }
    };
    AJS.MacroBrowser.setMacroJsOverride('jiralivesearch', jsOverrides);
});