/**
 * Created by s139742 on 13.11.2015.
 */
AJS.toInit(function ($) {
    require(['aui/inline-dialog2']);
    $.support.cors = true;

    var $searchInput = $('#search');

    var project = $('#project').val(),
        issueType = $('#issueType').val(),
        globalID = $('input#tableId').val();

    var $resultsTableDiv = $('div#table-' + globalID),
        $spinnerIcon = $('span.spinner-icon'),
        $errorMessage = $("div.errorMessages");

    initializeFields(project, issueType);
    initializeTemplate();
    initializeApp();

    var issueTypeArray = issueType.split(/\s*,\s*/g),
        projectArray = project.split(/\s*,\s*/g);

    var globalTimeout = null,
        globalSearchKey,
        tableOrderingGlobal = [];

    $searchInput.on('keyup', function() {
        if (globalSearchKey != $searchInput.val()) {
            if (globalTimeout != null) clearTimeout(globalTimeout);
            globalTimeout = setTimeout(SearchIssues, 1000);
        }
    });

    function SearchIssues() {
        var searchInputValue = $searchInput.val();
        globalTimeout = null;
        globalSearchKey = searchInputValue;

        if (searchInputValue.length > 2) {
            spinnerStart();
            clearTable();
            clearErrors();

            var filterFieldsArray = [];

            $('fieldset#filterSection').find('select').each(function(index, element) {
                var fieldId = $(this).prop("id").split("-")[1]
                var valuesArray = getSelectedFieldsFrom("select#" + $(this).prop('id'), true).map(function(elm) {
                    return (!isNaN(fieldId) ? "cf[" + fieldId + "]" : fieldId) + "::" + elm;
                });
                if (!valuesArray.isEmpty()) {
                    filterFieldsArray.push(valuesArray);
                }
            });

            var searchFieldsArray = getSelectedFieldsFrom("select#select-search-fields", false).map(function(elm) {
                return (!isNaN(elm) ? "cf[" + elm + "]" : elm);
            });

            var searchFieldNamesArray = getSelectedFieldsFrom("select#select-search-fields", true).map(function(elm) {
                return (!isNaN(elm) ? "cf[" + elm + "]" : elm);
            });

            var selectedFieldsFrom = getSelectedFieldsFrom("select#select-table-fields", false);

            var selectedFieldsFromSorted = selectedFieldsFrom.sortBy(function(elm) {
                return  $.inArray(elm, tableOrderingGlobal);
            });

            var tableFieldsArray = selectedFieldsFromSorted.map(function(elm) {
                return (!isNaN(elm) ? "customfield_" + elm : elm);
            });

            $.ajax({
                url: "/rest/jirasearch/latest/search",
                cache: false,
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify({
                    searchKeyword: encodeURIComponent(searchInputValue),
                    projectKeys: projectArray,
                    issueTypes: issueTypeArray,
                    //status: (status.isBlank() ? null : statusArray),
                    //components: (component.isBlank() ? null : componentsArray),
                    searchInFields: (searchFieldsArray.isEmpty() ? null : searchFieldsArray),
                    searchInFieldsNames: (searchFieldNamesArray.isEmpty() ? null : searchFieldNamesArray),
                    fields: (tableFieldsArray.isEmpty() ? null : tableFieldsArray),
                    filterFields: (filterFieldsArray.isEmpty() ? null : filterFieldsArray),
                    maxResults: 300,
                    expand: ["names"]
                }),
                success: function (data) {
                    buildTableFromData(data, tableFieldsArray);
                    spinnerStop();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    spinnerStop();

                    var msg = "";

                    if (jqXHR.status === 400) {
                        msg = "Feil i JIRA spørringen!"
                    } else {
                        msg = jqXHR.responseText;
                    }

                    AJS.messages.error("div.errorMessages", {
                        title: errorThrown,
                        body: '<p>' + msg + '</p>'
                    });
                },
                complete: function() {
                    spinnerStop();
                },
                timeout: 30000
            });
        }
    }

    function clearTable() {
        $resultsTableDiv.empty();
        $("aui-inline-dialog2").remove();
    }

    function clearErrors() {
        $errorMessage.empty();
    }

    function spinnerStart() {
        $spinnerIcon.addClass("aui-icon-wait").removeClass("aui-iconfont-search");
    }

    function spinnerStop() {
        $spinnerIcon.removeClass("aui-icon-wait").addClass("aui-iconfont-search");
    }

    function buildTableFromData(data, tableFieldsArray) {
        var message = $.parseJSON(data.message);
        var jiraIssues = message.issues;
        var fieldNames = message.names || {};

        $.each(jiraIssues, function(index, issue) {
            if (Object.has(issue.fields, "updated")) {
                issue.fields.updated = moment(issue.fields.updated).format('DD.MM.YY hh.mm')
            }

            if (Object.has(issue.fields, "created")) {
                issue.fields.created = moment(issue.fields.created).format('DD.MM.YY hh.mm')
            }
        });

        $.when(renameFieldNames(fieldNames).then(function() {

            var tableContent = NAV.KIV.Templates.LiveSearch.table({
                fieldKeys: tableFieldsArray,
                    issues: jiraIssues,
                    fieldNames: fieldNames,
                    totalFound: message.total
            });

        $resultsTableDiv.html(tableContent);
        AJS.tablessortable.setTableSortable($resultsTableDiv.find('table'));
    }));
}

function initializeTemplate() {
    var propertyKey = "lightboxTemplate";
    var editor = ace.edit("lightbox-template");

    $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
        function(data) {
                var data = data.value;

                editor.setTheme('ace/theme/eclipse');
                //editor.getSession().setMode('ace/mode/handlebars');

                editor.setValue(data.template);
            }
        ).fail(
            function(jqxhr) {
                if ($.parseJSON(jqxhr.responseText).statusCode == 404) {
                    var templateStandard = "<div class=\"aui-group aui-group-split\">\n" +
                        "     <div class=\"aui-item\" style=\"width: 66%;\">\n" +
                        "     <fieldset>\n" +
                        "         <div class=\"field-group\">\n" +
                        "             <label class=\"label-view\" for=\"summary\">Summary:</label>\n" +
                        "             <div class=\"field-view wordwrap\" id=\"summary\"><strong>{{fields.summary}}</strong></div>\n" +
                        "         </div>\n" +
                        "         <div class=\"field-group\">\n" +
                        "             <label class=\"label-view\" for=\"beskrivelse\">Beskrivelse:</label>\n" +
                        "             <div class=\"field-view wordwrap\" id=\"beskrivelse\">{{{renderedFields.description}}}</div>\n" +
                        "         </div>\n" +
                        "     </fieldset>\n" +
                        "     </div>\n" +
                        "     <div class=\"aui-item\">\n" +
                        "     <fieldset>\n" +
                        "         <div class=\"field-group\">\n" +
                        "             <label class=\"label-view\" for=\"status\">Status:</label>\n" +
                        "             <div class=\"field-view wordwrap\" style=\"color: green;\" id=\"status\"><strong>{{fields.status.name}}</strong></div>\n" +
                        "         </div>\n" +
                        "         <div class=\"field-group\">\n" +
                        "             <label class=\"label-view\" for=\"relasjon\">Relasjoner til andre begreper:</label>\n" +
                        "             <div class=\"field-view wordwrap\" id=\"relasjon\">{{#each issuelinks}}{{this.outwardIssue.key}} ({{this.outwardIssue.fields.status.name}}){{#unless @last}}, {{/unless}}{{/each}}</div>\n" +
                        "         </div>\n" +
                        "         <div class=\"field-group\">\n" +
                        "              <label class=\"label-view\" for=\"oppdatert\">Opprettet:</label>\n" +
                        "              <div class=\"field-view wordwrap\" id=\"opprettet\">{{{renderedFields.created}}}</div>\n" +
                        "          </div>\n" +
                        "         <div class=\"field-group\">\n" +
                        "             <label class=\"label-view\" for=\"oppdatert\">Sist oppdatert:</label>\n" +
                        "             <div class=\"field-view wordwrap\" id=\"oppdatert\">{{{renderedFields.updated}}}</div>\n" +
                        "         </div>\n" +
                        "     </fieldset>\n" +
                        "     </div>\n" +
                        " </div>";
                    $.when(createPageProperty(AJS.params.pageId, propertyKey, {"template": templateStandard})).done(function() {
                        initializeTemplate();
                    });
                }
            }
        );

        $("button#button-save-template").bind('click', function() {
            var template = editor.getValue();

            $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
                function(data) {
                    var propVersion = data.version.number,
                        propId = data.id;

                    $.when(updatePageProperty(AJS.params.pageId, propId, propertyKey, propVersion, {"template": template})).then(function(data) {
                        require(['aui/flag'], function (flag) {
                            flag({
                                type: "success",
                                title: "Saved!",
                                close: "auto",
                                body: "Template successfully saved."
                            });
                        });
                    });
                }
            );
        });
    }

    function renameFieldNames(jsonNames) {
        var request = $.when(getPageProperty(AJS.params.pageId, "renamedFields")).then(
                function (data) {
                    var savedRenamedValues = data.value;

                    $.each(savedRenamedValues, function (index, sField) {
                        if (!isNaN(sField.fieldId) && Object.has(jsonNames, "customfield_" + sField.fieldId)) {
                            jsonNames["customfield_" + sField.fieldId] = sField.newName;
                        }
                        else if (Object.has(jsonNames, sField.fieldId)) {
                            jsonNames[sField.fieldId] = sField.newName;
                        }
                    });
                });
        return request;
    }

    function initializeApp() {
        showHideConfigMenu();
        showHideFilterMenu();
        initializeLightbox();

        Handlebars.registerHelper('equals', function(v1, v2, options) {
            if (v1 === v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    function showHideConfigMenu() {
        $.when(getPageEditRestrictions(AJS.params.pageId)).done(function(data) {
            var userRestrictions = data.restrictions.user;
            var remoteUser = AJS.params.remoteUserKey;

            if (userRestrictions.size > 0) {
                $.each(userRestrictions.results, function(index, restriction) {
                    if (restriction.userKey === remoteUser) {
                        var $button = $("button#configuration-toggle");
                        $button.removeClass('hidden');
                        $button.on('click', function (evt) {
                            $("div.toggle").toggle();
                            evt.preventDefault();
                        });
                    }
                })
            }
        })
    }

    function showHideFilterMenu() {
        $.when(getPageProperty(AJS.params.pageId, "filterInFields")).done(
            function(data) {
                var savedSelectedValues = data.value;
                if (!savedSelectedValues.isEmpty()) {
                    var $button = $("button#filters-toggle");
                    $button.removeClass('hidden');
                    $button.on('click', function (evt) {
                        $("div#search-filters").toggle();
                        evt.preventDefault();
                    });
                }
            });
    }

    function initializeLightbox() {
        var inlineDialog = $('aui-inline-dialog2.aui-inline-dialog');
        inlineDialog.live("aui-layer-show", function(e) {

            var $current = $(this),
                issueKey = $current.prop('id').split("_")[1],
                content = $current.find("div#tabs-" + issueKey + " div#dialog-content");

            $.when(getPageProperty(AJS.params.pageId, "lightboxTemplate"), getIssueFromJira(issueKey)).done(function(temp, issues) {

                var template = Handlebars.compile(temp[0].value.template);
                var issue = $.parseJSON(issues[0].message).issues[0];
                content.html(template(issue));
                //$current.show();

                createD3dependencyDiagram(issueKey, transformData(issue));

                $("html, body").animate({
                    scrollTop: $current.offset().top - 50
                }, 1);

            });

            // Initialize the autocomplete share field.
            $("input#d-share").autocomplete({
                source: function( request, response ) {
                    $.ajax({
                        url: "/rest/prototype/1/search/user-or-group.json",
                        dataType: "json",
                        data: {
                            "max-results": 10,
                            "query": request.term
                        },
                        success: function( data ) {
                            var results = $.map(data.result, function(elm) { return {label: elm.title , value: elm.username} });
                            response( results );
                        }
                    });
                },
                minLength: 2,
                select: function( event, ui ) {
                    AJS.log( ui.item ?
                    "Selected: " + ui.item.label :
                    "Nothing selected, input was " + this.value);
                },
                open: function() {
                    $( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" );
                },
                close: function() {
                    $( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" );
                }
            });

            $("button#share").click(function(evt) {
                var $shareInput = $current.find("input#d-share");
                var shareTo = $shareInput.val();

                if (shareTo) {
                    $.ajax({
                        url: "/rest/jirasearch/latest/share",
                        cache: false,
                        type: "POST",
                        dataType: "json",
                        contentType: 'application/json',
                        data: JSON.stringify({
                            username: encodeURIComponent(shareTo),
                            issue: issueKey
                        }),
                        success: function () {
                            $shareInput.val("");
                            require(['aui/flag'], function (flag) {
                                flag({
                                    type: "success",
                                    title: "",
                                    close: "auto",
                                    body: "<span class=\"aui-icon aui-icon-small aui-iconfont-approve\" style=\"color: green;\"></span> Shared!"
                                });
                            });
                        },
                        timeout: 30000
                    });
                }
            });
        });

        inlineDialog.find("button.close-dialog-button").live("click", function() {
            document.querySelector("aui-inline-dialog2#" + $(this).attr("aria-dialog-id")).hide();
        });
    }

    function transformData(issue) {
        var children = {};

        $.each(issue.fields.issuelinks, function(index, issuelink) {
            if (Object.has(issuelink, "outwardIssue")) {
                var type = issuelink.type.outward;
                processIssueLink(type, issuelink.outwardIssue, children);
            } else { // inwardIssue
                var type = issuelink.type.inward;
                processIssueLink(type, issuelink.inwardIssue, children);
            }
        });

        var childs = [];

        $.each(children, function(key, value) {
            childs.push({"name":key, children: value})
        });

        var data = {
            'name': "{1}".assign(issue.fields.summary),
            'key': issue.key,
            'children': childs
        }

        return data;
    }

    function processIssueLink(linkType, link, output) {
        if(Object.has(output, linkType)) {
            output[linkType].push({'name': "{1} Status: {2}".assign(link.fields.summary, link.fields.status.name), 'key': link.key})
        } else {
            output[linkType] = [];
            output[linkType].push({'name': "{1} Status: {2}".assign(link.fields.summary, link.fields.status.name), 'key': link.key})
        }
    }

    function initializeFields(project, issueType) {
        $.getJSON("/rest/jirasearch/latest/search/metadata", {
            projectKey: project,
            issuetypeName: issueType
        }).done(function (data) {
            parseFields($.parseJSON(data.message));
        });
    }

    function parseFields(metadata) {
        if (Object.has(metadata, 'projects')) {
            var statusField = {
                "schema":{
                    "type":"array",
                    "system":"status"
                },
                "name":"Status"};
            var keyField = {
                "schema":{
                    "type":"string",
                    "system":"key"
                },
                "name":"Key"};

            var updatedField = {
                "schema":{
                    "type":"string",
                    "system":"updated"
                },
                "name":"Updated"};

            var createdField = {
                "schema":{
                    "type":"string",
                    "system":"created"
                },
                "name":"Created"};

            var searchFields = [],
                allFields = [statusField, keyField, updatedField, createdField],
                filterFields = [statusField];

            $.each(metadata.projects[0].issuetypes[0].fields, function(key, field) {
                if (Object.has(field['schema'], 'system') && field.schema.system == "summary") {
                    searchFields.push(field);
                }
                else if (Object.has(field['schema'], 'system') && field.schema.system == "components") {
                    filterFields.push(field)
                }
                // Search in custom text fields
                else if (Object.has(field['schema'], 'custom') && field.schema.custom.indexOf("text") > 0) {
                    searchFields.push(field);
                }
                // Search for custom cascading fields
                else if (Object.has(field['schema'], 'custom') && (field.schema.custom.indexOf("select") > 0 || field.schema.custom.indexOf("checkbox") > 0)) {
                    filterFields.push(field);
                }

                allFields.push(field);
            });

            initializeRenameWithData(allFields, "renamedFields");

            initializeSelectWithData(searchFields, "searchInFields");
            initializeSelectWithData(filterFields, "filterInFields");

            initializeSelectWithData(allFields, "tableFields");

            initializeTableOrder(allFields, "tableOrder");
        }
    }

    function initializeTableOrder(fieldsArray, propertyKey) {
        var savedValues = [];
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                savedValues = data.value;
                tableOrderingGlobal = savedValues;
                var $ul = $("ul#sort-table-fields");

                $.each(savedValues, function(index, fieldId) {
                    var field = fieldsArray.find(function(elm) {
                        if (Object.has(elm['schema'], 'customId')) {
                            return elm.schema.customId == fieldId;
                        } else if (Object.has(elm['schema'], 'system')) {
                            return elm.schema.system == fieldId;
                        }
                    });
                   if (field) {
                       $ul.append("<li data-value=\"{1}\">{2}</li>".assign(field.schema.customId || field.schema.system, field.name));
                   }
                });
                $ul.sortable({"forcePlaceholderSize": true, "items": "li"}).bind('sortupdate', function(evt, ui) {
                    var sortingArray = [];
                    $ul.find("li").each(function(index, elm){
                        var selfValue = $(this).attr('data-value');
                        if (!isNaN(selfValue)) {
                            sortingArray.push(parseInt(selfValue));
                        } else {
                            sortingArray.push(selfValue);
                        }
                    });
                    updateTableSort(propertyKey, sortingArray);
                });
            }
        ).fail(
            function(jqxhr, status, textStatus) {
                if ($.parseJSON(jqxhr.responseText).statusCode == 404) {

                    var felter = fieldsArray.map(function(elm) {
                        return elm.schema.customId || elm.schema.system;
                    });

                    $.when(createPageProperty(AJS.params.pageId, propertyKey, felter)).done(function() {
                        initializeTableOrder(fieldsArray, propertyKey);
                    });
                }
            }
        );
    }

    function updateTableSort(propertyKey, sortArray) {
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                var propVersion = data.version.number,
                    propId = data.id;

                $.when(updatePageProperty(AJS.params.pageId, propId, propertyKey, propVersion, sortArray)).then(function(data) {
                    tableOrderingGlobal = sortArray;
                    require(['aui/flag'], function (flag) {
                        flag({
                            type: "success",
                            title: "Saved!",
                            close: "auto",
                            body: "Sorting successfully saved."
                        });
                    });
                });
            }
        );
    }

    function initializeRenameWithData(fieldsArray, propertyKey) {
        var savedSelectedValues = [];
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                savedSelectedValues = data.value;
                initializeRenameElements(savedSelectedValues, fieldsArray, "select#select-rename-fields", propertyKey);
            }
        ).fail(
            function(jqxhr, status, textStatus) {
                if ($.parseJSON(jqxhr.responseText).statusCode == 404) {
                    $.when(createPageProperty(AJS.params.pageId, propertyKey, [])).done(function() {
                        initializeRenameWithData(fieldsArray, propertyKey);
                    });
                }
            }
        );
    }

    function initializeRenameElements(renamedFieldValues, fieldsArray, selectFieldSelector, propertyKey) {
        var $select = $(selectFieldSelector);
        var renamedFieldIds = [];

        // Initialize the table
        $.each(renamedFieldValues, function(index, sField) {
            var fieldId = sField.fieldId;
            var fieldValues = sField;

            renamedFieldIds.push(fieldId.toString());

            $("table tbody#table-rename-rows").append("<tr id=\"customfield_{1}\"><td>{2}</td><td>{3}</td><td><button id=\"button-remove-field_{1}\" class=\"aui-button remove-rename\"><span class=\"aui-icon aui-icon-small aui-iconfont-list-remove\">Remove </span> remove</button></td></tr>"
                .assign(fieldId, fieldValues.oldName, fieldValues.newName))
        });

        // Initialize the Select dropdown
        $.each(fieldsArray, function(index, field) {
            var fieldId = (Object.has(field['schema'], 'customId') ? field.schema.customId : field.schema.system);

            if ($.inArray(fieldId.toString(), renamedFieldIds) == -1) {
                $select.append("<option value=\"{1}\">{2}</option>".assign(fieldId, field.name));
            }
        });

        $select.chosen({"width": "100%"});

        // Bind the Add button action
        $("button#button-rename-fields").bind('click', function() {
            var $renameSelect = $("select#select-rename-fields");
            var $renameInput = $("input#input-rename-fields");
            var $renamedTable = $("table tbody#table-rename-rows"),
                $selectList = $renameSelect.val(),
                $newNameField = $renameInput.val();

            if ($selectList && $newNameField) {
                var $selectedOption = $("select#select-rename-fields  option:selected");
                var oldFieldName = $selectedOption.text();
                updateRenamedElements(propertyKey, $selectList, oldFieldName, $newNameField)

                $renamedTable.append("<tr id=\"customfield_{1}\"><td>{2}</td><td>{3}</td><td><button id=\"button-remove-field_{1}\" class=\"aui-button remove-rename\"><span class=\"aui-icon aui-icon-small aui-iconfont-list-remove\">Remove </span> remove</button></td></tr>"
                    .assign($selectList, oldFieldName, $newNameField))

                $renameInput.val("");
                $selectedOption.remove();
                $renameSelect.trigger("chosen:updated");
            } else { // some warn message
            }
        });

        $("button.remove-rename").live('click', function(evt, change) {
            var fieldId = $(this).prop('id').split('_')[1];
            deleteRenamedElements(propertyKey, fieldId);
        });
    }

    function updateRenamedElements(propertyKey, oldFieldId, oldFieldName, newFieldName) {
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                var propVersion = data.version.number,
                    propId = data.id,
                    value = data.value;

                var newField = {"fieldId": oldFieldId, "oldName": oldFieldName, "newName": newFieldName};
                value.push(newField);

                $.when(updatePageProperty(AJS.params.pageId, propId, propertyKey, propVersion, value)).then(function(data) {
                    require(['aui/flag'], function (flag) {
                        flag({
                            type: "success",
                            title: "Saved!",
                            close: "auto",
                            body: "Property successfully saved."
                        });
                    });
                });
            }
        );
    }

    function deleteRenamedElements(propertyKey, fieldId) {
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                var propVersion = data.version.number,
                    propId = data.id,
                    value = data.value;

                var deleteIndex = value.findIndex(function (elm) {
                   return elm['fieldId'] == fieldId;
                });

                if (deleteIndex > -1) {

                    var fieldToDelete = value.splice(deleteIndex, 1);

                    $.when(updatePageProperty(AJS.params.pageId, propId, propertyKey, propVersion, value)).then(function(data) {

                        $("tr#customfield_" + fieldId).remove();
                        var $renameSelect = $("select#select-rename-fields");
                        $renameSelect.append("<option value=\"{1}\">{2}</option>".assign(fieldId, fieldToDelete.first().oldName));
                        $renameSelect.trigger("chosen:updated");

                        require(['aui/flag'], function (flag) {
                            flag({
                                type: "success",
                                title: "Saved!",
                                close: "auto",
                                body: "Property successfully deleted."
                            });
                        });
                    });
                }
            }
        );
    }

    function initializeSelectWithData(fieldsArray, propertyKey) {
        var savedSelectedValues = [];
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                savedSelectedValues = data.value;

                if ("searchInFields" == propertyKey) {
                    initializeAdvancedFieldsSelect(savedSelectedValues, fieldsArray, "select#select-search-fields", propertyKey);
                } else if ("filterInFields" == propertyKey) {
                    initializeAdvancedFieldsSelect(savedSelectedValues, fieldsArray, "select#select-filter-fields", propertyKey);
                } else if ("tableFields" == propertyKey) {
                    initializeAdvancedFieldsSelect(savedSelectedValues, fieldsArray, "select#select-table-fields", propertyKey);
                }
            }
        ).fail(
            function(jqxhr, status, textStatus) {
                if ($.parseJSON(jqxhr.responseText).statusCode == 404) {
                    $.when(createPageProperty(AJS.params.pageId, propertyKey, [])).done(function() {
                        initializeSelectWithData(fieldsArray, propertyKey);
                    });
                }
            }
        );
    }

    function initializeAdvancedFieldsSelect(selectedFieldsValueArray, fieldsArray, selectFieldSelector, propertyKey) {
        var $select = $(selectFieldSelector);

        $.each(fieldsArray, function(index, sField) {
            var selected = "";

            if (Object.has(sField['schema'], 'customId') && $.inArray(sField.schema.customId, selectedFieldsValueArray) >= 0) {
                selected = "selected";
            } else if (Object.has(sField['schema'], 'system') && $.inArray(sField.schema.system, selectedFieldsValueArray) >= 0) {
                selected = "selected";
            }

            if ("selected" == selected && "filterInFields" == propertyKey) {
                if (Object.has(sField['schema'], 'custom') && (sField.schema.custom.indexOf("select") >= 0 || sField.schema.custom.indexOf("checkbox") >= 0)) {
                    addFilterWithId(sField);
                } else if (Object.has(sField['schema'], 'system') && sField.schema.system.indexOf("components") >= 0) {
                    addFilterWithId(sField);
                } else if (Object.has(sField['schema'], 'system') && sField.schema.system.indexOf("status") >= 0) {
                    $.when(getStatusesFromJIRA(project)).done(function(data) {
                        var statuses = $.parseJSON(data.message)[0];
                        statuses['name'] = "Status";
                        statuses['schema'] = {};
                        statuses['schema']['system'] = "status";
                        addFilterWithId(statuses);
                    });

                }
            }

            $select.append("<option value=\"{1}\" {2}>{3}</option>".assign((Object.has(sField['schema'], 'customId') ? sField.schema.customId : sField.schema.system), selected, sField.name));
        });

        $select.chosen({"width": "100%"}).change(function(evt, change) {
            updateContentPropertyFieldSelect(propertyKey, selectFieldSelector);
        });
    }

    function addFilterWithId(field) {
        var fieldId = field.schema.customId || field.schema.system,
            fieldLabel = "Filtrer på " + field.name,
            fieldPlaceholder = "Velg " + field.name.toLowerCase(),
            fieldDesc = "";

        var fieldOpts = [];

        var preselectedFields = getCookie(fieldId + AJS.params.remoteUserKey);
        var fieldsFromCookieArray = preselectedFields.split("||");

        if (Object.has(field, 'allowedValues')) {
            $.each(field.allowedValues, function(index, value) {
                var selected = "";
                if ($.inArray(value.id, fieldsFromCookieArray) >= 0) {
                    selected = "selected";
                }
                fieldOpts.push({"id": value.id, "value": value.value || value.name, "selected": selected});
                if (Object.has(value, "children")) {
                    $.each(value.children, function(index, child) {
                        var selected = "";
                        if ($.inArray(child.id, fieldsFromCookieArray) >= 0) {
                            selected = "selected";
                        }
                        fieldOpts.push({"id": child.id, "value": child.value, "selected": selected});
                    });
                }
            });
        } else if (Object.has(field, 'statuses')) {
            $.each(field.statuses, function(index, value) {
                var selected = "";
                if ($.inArray(value.id, fieldsFromCookieArray) >= 0) {
                    selected = "selected";
                }
                fieldOpts.push({"id": value.id, "value": value.name, "selected": selected});
            });
        }
        var filterSelectField = NAV.KIV.Templates.LiveSearch.filterField({
            "fieldId": fieldId,
            "fieldLabel": fieldLabel,
            "fieldDesc": fieldDesc,
            "fieldOpts": fieldOpts,
            "fieldPlaceholder": fieldPlaceholder
        });

        $("#filterSection").append(filterSelectField);

        var selector = "select#select-" + fieldId + "-fields";
        var $selectField = $(selector);
        $selectField.chosen({"width": "100%"}).change(function(evt) {
            var currentSelect = evt.currentTarget;
            var fieldId = $(currentSelect).prop('id').split('-')[1];
            var selectedElements = getSelectedFieldsFrom(selector, false);
            setCookie(fieldId + AJS.params.remoteUserKey, selectedElements.join("||"), 365);
            SearchIssues();
        });
    }

    function updateContentPropertyFieldSelect(propertyKey, fieldSelector) {
        $.when(getPageProperty(AJS.params.pageId, propertyKey)).done(
            function(data) {
                var propVersion = data.version.number,
                    propId = data.id,
                    selectedFieldsArray = getSelectedFieldsFrom(fieldSelector);

                $.when(updatePageProperty(AJS.params.pageId, propId, propertyKey, propVersion, selectedFieldsArray)).then(function(data) {
                    require(['aui/flag'], function (flag) {
                        flag({
                            type: "success",
                            title: "Saved!",
                            close: "auto",
                            body: "Property successfully saved."
                        });
                    });
                });
            }
        );
    }

    function getSelectedFieldsFrom(selectFieldSelector, textValue) {
        var getTextValue = textValue || false;
        var $selectField = $(selectFieldSelector + " :selected"),
            selectedValues = [];

        $selectField.each(function() {
            var field;
            if(getTextValue) {
                field = $(this).text();
            } else {
                field = $(this).val()
            }
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

    function getIssueFromJira(issueKey) {
        return $.ajax({
            url: "/rest/jirasearch/latest/search",
            cache: false,
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify({
                issueKeys: [issueKey],
                expand: ["names","renderedFields"]
            })
        });
    }

    function getStatusesFromJIRA(projectKey) {
        return $.ajax({
            url: "/rest/jirasearch/latest/search/metadata/statuses",
            type: "GET",
            dataType: "json",
            contentType: 'application/json',
            data: {
                projectKey: projectKey
            }
        });
    }

    function getPageEditRestrictions(pageId) {
        return $.ajax({
            url: "/rest/api/content/" + pageId + "/restriction/byOperation/update",
            type: "GET",
            dataType: "json",
            contentType: 'application/json'
        });
    }

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    }

    function createD3dependencyDiagram(issueKey, flare) {

        var margin = {top: 20, right: 10, bottom: 20, left: 10},
            width = 850 - margin.left - margin.right,
            barHeight = 25,
            barWidth = width * .8;

        var i = 0,
            duration = 400,
            root;

        var tree = d3.layout.tree()
            .nodeSize([0, 20]);

        var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        var svg = d3.select("aui-inline-dialog2#lightbox-dialog_" + issueKey + " div#tabs-" + issueKey + " div#dialog-content").append("svg")
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        flare.x0 = 0;
        flare.y0 = 0;
        update(root = flare);

        function update(source) {

            // Compute the flattened node list.
            var nodes = tree.nodes(root);

            var height = Math.max(300, nodes.length * barHeight + margin.top + margin.bottom);

            d3.select("aui-inline-dialog2#lightbox-dialog_" + issueKey + " div#tabs-" + issueKey + " div#dialog-content svg").transition()
                .duration(duration)
                .attr("height", height);

            d3.select(self.frameElement).transition()
                .duration(duration)
                .style("height", height + "px");

            // Compute the "layout".
            nodes.forEach(function(n, i) {
                n.x = i * barHeight;
            });

            // Update the nodes…
            var node = svg.selectAll("g.node")
                .data(nodes, function(d) { return d.id || (d.id = ++i); });

            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .style("opacity", 1e-6);

            // Enter any new nodes at the parent's previous position.
            nodeEnter.append("rect")
                .attr("y", -barHeight / 2)
                .attr("height", barHeight - 5)
                .attr("width", barWidth)
                .style("fill", color)
                .on("click", click);

            nodeEnter.append("text")
                .attr("dy", 1.5)
                .attr("dx", 5.5)
                .text(function(d) { return d.name; });

            // Transition nodes to their new position.
            nodeEnter.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                .style("opacity", 1);

            node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                .style("opacity", 1)
                .select("rect")
                .style("fill", color);

            // Transition exiting nodes to the parent's new position.
            node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .style("opacity", 1e-6)
                .remove();

            // Update the links…
            var link = svg.selectAll("path.link")
                .data(tree.links(nodes), function(d) { return d.target.id; });

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                })
                .transition()
                .duration(duration)
                .attr("d", diagonal);

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", diagonal);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Toggle children on click.
        function click(d) {
            if (d.key) {
                window.open("http://jira.adeo.no/browse/" + d.key, '_blank');
            } else {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            }
        }

        function color(d) {
            return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
        }

    }
});