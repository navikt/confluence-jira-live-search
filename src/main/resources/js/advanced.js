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
        showLabeledFields = $('#showLabeledFields').val()
    //fixedReturnFields = ["summary", "key", "status"]

    var searchFieldsArray = searchInFields.split(/\s*,\s*/g).map(function(elm) {
            return (elm.has("customfield_") ? "cf[" + elm.split("_")[1] + "]" : elm);
        }),
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

    //var config = initializeFields(project, issueType);
    //AJS.log(config);

    $('#search').keyup(function () {
        var $input = $(this),
            $form = $input.closest('form'),
            $searchButton = $form.find('.aui-icon.aui-iconfont-search'),
            searchField = $('#search').val();

        if (searchField.length > 2) {
            $searchButton.addClass("aui-icon-wait").removeClass("aui-iconfont-search");
            $("div.aui-dd-parent").html("");

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
            Object.keys(metadata.projects[0].issuetypes[0].fields, function (key, field) {
                AJS.log("field: " + field.name + " [" + key + "]")

                var searchField = searchFieldsArray.find(function (elm) {
                    return elm == field.name;
                });

                var showField = showFieldsArray.find(function (elm) {
                    return elm == field.name;
                });

                var fieldLabel = searchField || showField;
                if (fieldLabel) {

                    var newField = Object.extended();

                    newField.key = key;
                    newField.id = (key.has("customfield_") ? key.split("_")[1] : key);
                    newField.showLabel = showFieldsArray[searchFieldsArray.findIndex(function (elm) {
                        return elm == field.name
                    })];

                    if (newField.showLabel.has(":")) {
                        newField.showLabel = newField.showLabel.split(":")[1];
                    }

                    AJS.log(newField);

                    fieldConfig[field.name] = newField;
                }

            });
        }

        return fieldConfig;
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

});