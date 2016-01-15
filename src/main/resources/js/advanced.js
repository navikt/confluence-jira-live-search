/**
 * Created by s139742 on 13.11.2015.
 */
AJS.toInit(function ($) {
    $.support.cors = true;

    var project = $('#project').val(),
        issueType = $('#issueType').val(),
        status = $('#status').val(),
        component = $('#component').val(),
        id = $('input#tableId').val(),

        searchInFields = $('#searchInFields').val().toLowerCase(),
        showLabeledFields = $('#showLabeledFields').val();
    //fixedReturnFields = ["summary", "key", "status"]

    var config = initializeFields(project, issueType);

    var /*searchFieldsArray = searchInFields.split(/\s*,\s*//*g).map(function(elm) {
            return (elm.has("customfield_") ? "cf[" + elm.split("_")[1] + "]" : elm);
        }),*/
        showFieldsArray = showLabeledFields.split(/\s*,\s*/g)/*.union(fixedReturnFields)*/,
        componentsArray = component.split(/\s*,\s*/g),
        statusArray = status.split(/\s*,\s*/g),
        issueTypeArray = issueType.split(/\s*,\s*/g),
        projectArray = project.split(/\s*,\s*/g);


    //AJS.log(showFieldsArray);

    /*    AJS.$.each(showFieldsArray, function(elm) {
     if (elm.has(":")){
     var split = elm.split(":");
     translationsArray.split[0] = split[1];
     }
     });*/

    /*    AJS.log(translationsArray);*/




    //AJS.log(config);

    $('#search').keyup(function () {
        var $input = $(this),
            $form = $input.closest('form'),
            $searchButton = $form.find('.aui-icon.aui-iconfont-search'),
            searchField = $('#search').val();

        if (searchField.length > 2) {
            $searchButton.addClass("aui-icon-wait").removeClass("aui-iconfont-search");
            $("div.aui-dd-parent").html("");

            var searchFieldsArray = getSelectedFieldsFrom("select#select-search-fields").map(function(elm) {
                return (!isNaN(elm) ? "cf[" + elm + "]" : elm);
            });

            $.ajax({
                url: "/rest/jirasearch/latest/search",
                cache: false,
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify({
                    searchKeyword: encodeURIComponent(searchField),
                    projectKeys: projectArray,
                    issueTypes: issueTypeArray,
                    status: (status.isBlank() ? null : statusArray),
                    components: (component.isBlank() ? null : componentsArray),
                    searchInFields: (searchInFields.isBlank() ? null : searchFieldsArray),
                    fields: (showLabeledFields.isBlank() ? null : showFieldsArray),
                    maxResults: 200,
                    expand: ["names"]
                }),
                success: function (data) {
                    var table = buildTableFromData(data);
                    /*var find = searchField;
                     var re = new RegExp(find, 'gi');*/
                    $('div#table-' + id).html(table);

                    $searchButton.removeClass("aui-icon-wait").addClass("aui-iconfont-search");

                    AJS.tablessortable.setTableSortable(AJS.$("table#search-jira-results"));
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    $searchButton.removeClass("aui-icon-wait").addClass("aui-iconfont-search");

                    var msg = "";

                    if (jqXHR.status === 400) {
                        msg = "Feil i JIRA spørringen!"
                    } else {
                        msg = jqXHR.responseText;
                    }

                    AJS.messages.error("div.aui-dd-parent", {
                        title: errorThrown,
                        body: '<p>' + msg + '</p>'
                    });
                },
                timeout: 30000
            });
        }
    });

    function buildTableFromData(data) {
        var message = $.parseJSON(data.message);
        var jsonIssues = message.issues;
        var jsonNames = message.names;

        return NAV.KIV.Templates.LiveSearch.table({
            fieldKeys: showFieldsArray,
            issues: jsonIssues,
            fieldNames: jsonNames
        });
    }

    function initializeFields(project, issueType) {
        $.getJSON("/rest/jirasearch/latest/search/metadata", {
            projectKey: project,
            issuetypeName: issueType
        }).done(function (data) {
            return parseFields($.parseJSON(data.message));
        });
    }

    function parseFields(metadata) {
        var fieldConfig = Object.extended();

        if (Object.has(metadata, 'projects')) {
            var searchFields = [];

            AJS.$.each(metadata.projects[0].issuetypes[0].fields, function(key, field) {
                AJS.log("field: " + field);

                if (Object.has(field['schema'], 'system') && field.schema.system == "summary") {
                    searchFields.push(field);
                }
                // Search in custom text fields
                else if (Object.has(field['schema'], 'custom') && field.schema.custom.indexOf("text") > 0) {
                    searchFields.push(field);
                }
            });

            initializeSelects(searchFields, "searchInFields");
        }

        return fieldConfig;
    }

    function initializeSelects(fieldsArray, propertyKey) {
        var savedSelectedValues = [];
        AJS.$.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                savedSelectedValues = data.value;

                if ("searchInFields" == propertyKey) {
                    initializeSearchInFieldsSelect(savedSelectedValues, fieldsArray);
                }
            }
        ).fail(
            function(jqxhr, status, textStatus) {
                if ($.parseJSON(jqxhr.responseText).statusCode == 404) {
                    $.when(createPageProperty(AJS.params.pageId, propertyKey, [])).done(function() {
                        initializeSelects(fieldsArray, propertyKey);
                    });
                }
            }
        );
    }

    function initializeSearchInFieldsSelect(selectedFieldsValueArray, fieldsArray) {
        var $select = AJS.$("select#select-search-fields");

        AJS.$.each(fieldsArray, function(index, sField) {
            var selected = "";

            if (Object.has(sField['schema'], 'customId') && $.inArray(sField.schema.customId, selectedFieldsValueArray) >= 0) {
                selected = "selected";

            } else if (Object.has(sField['schema'], 'system') && $.inArray(sField.schema.system, selectedFieldsValueArray) >= 0) {
                selected = "selected";
            }
            $select.append("<option value=\"{1}\" {2}>{3}</option>".assign((Object.has(sField['schema'], 'customId') ? sField.schema.customId : sField.schema.system), selected, sField.name));
        });

        $select.chosen({"width": "100%"}).change(function(evt, change) {
            updateContentPropertyFieldSelect("searchInFields");
        });
    }

    function updateContentPropertyFieldSelect(propertyKey) {
        AJS.$.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                var propVersion = data.version.number,
                    propId = data.id,
                    selectedFieldsArray = getSelectedFieldsFrom("select#select-search-fields");

                $.when(updatePageProperty(AJS.params.pageId, propId, propertyKey, propVersion, selectedFieldsArray)).then(function(data) {
                    require(['aui/flag'], function (flag) {
                        flag({
                            type: "success",
                            title: "Saved!",
                            persistent: false,
                            body: "\"Search in fields\" property successfully saved."
                        });
                    });
                });
            }
        );
    }

    function getSelectedFieldsFrom(selectFieldSelector) {
        var $selectField = $(selectFieldSelector + " :selected"),
            selectedValues = [];

        $selectField.each(function() {
            var field = $(this).val()
            if (!isNaN(field)) {
                selectedValues.push(parseInt(field));
            } else {
                selectedValues.push(field);
            }
        });

        return selectedValues;
    }

    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };

    function escapeHtml(string) {
        return String(string).replace(/[&<>"'\/]/g, function (s) {
            return entityMap[s];
        });
    }

    function getPageProperty(pageId, propertyName) {
        return $.ajax({
            url: "/rest/api/content/" + pageId + "/property/" + propertyName,
            cache: false,
            type: "GET",
            dataType: "json",
            contentType: 'application/json',
            timeout: 30000
        });
    }

    function createPageProperty(pageId, propertyName, initialValue) {
        return $.ajax({
            url: "/rest/api/content/" + pageId + "/property/" + propertyName,
            cache: false,
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify({
                "key": propertyName,
                "value": initialValue
            }),
            timeout: 30000
        });
    }

    function updatePageProperty(pageId, propertyId, propertyName, latestVersion, newValue) {
        return $.ajax({
            url: "/rest/api/content/" + pageId + "/property/" + propertyName,
            cache: false,
            type: "PUT",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify({
                "id": propertyId,
                "key": propertyName,
                "value": newValue,
                "version": {
                    "number": latestVersion + 1,
                    "minorEdit": false
                }
            }),
            timeout: 30000
        });
    }
});