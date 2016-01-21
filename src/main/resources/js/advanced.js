/**
 * Created by s139742 on 13.11.2015.
 */
AJS.toInit(function ($) {
    require(['aui/inline-dialog2']);
    $.support.cors = true;

    var $searchInput = $('#search');

    var project = $('#project').val(),
        issueType = $('#issueType').val(),
        status = $('#status').val(),
        component = $('#component').val(),
        globalID = $('input#tableId').val();

    var $resultsTableDiv = $('div#table-' + globalID),
        $spinnerIcon = $('span.spinner-icon'),
        $errorMessage = $("div.aui-dd-parent");

    initializeFields(project, issueType);
    initializeTemplate();
    initializeApp();

    var componentsArray = component.split(/\s*,\s*/g),
        statusArray = status.split(/\s*,\s*/g),
        issueTypeArray = issueType.split(/\s*,\s*/g),
        projectArray = project.split(/\s*,\s*/g);

    var globalTimeout = null,
        globalSearchKey;

    $searchInput.on('keyup', function() {
        if (globalSearchKey != $searchInput.val()) {
            if (globalTimeout != null) clearTimeout(globalTimeout);
            globalTimeout = setTimeout(SearchIssues, 750);
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

            var searchFieldsArray = getSelectedFieldsFrom("select#select-search-fields", false).map(function(elm) {
                return (!isNaN(elm) ? "cf[" + elm + "]" : elm);
            });

            var searchFieldNamesArray = getSelectedFieldsFrom("select#select-search-fields", true).map(function(elm) {
                return (!isNaN(elm) ? "cf[" + elm + "]" : elm);
            });

            var tableFieldsArray = getSelectedFieldsFrom("select#select-table-fields").map(function(elm) {
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
                    status: (status.isBlank() ? null : statusArray),
                    components: (component.isBlank() ? null : componentsArray),
                    searchInFields: (searchFieldsArray.isEmpty() ? null : searchFieldsArray),
                    searchInFieldsNames: (searchFieldNamesArray.isEmpty() ? null : searchFieldNamesArray),
                    fields: (tableFieldsArray.isEmpty() ? null : tableFieldsArray),
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

                    AJS.messages.error("div.aui-dd-parent", {
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

        $.when(renameFieldNames(fieldNames).then(function() {

            var tableContent = NAV.KIV.Templates.LiveSearch.table({
                fieldKeys: tableFieldsArray,
                issues: jiraIssues,
                fieldNames: fieldNames,
                totalFound: message.total
            });

            $resultsTableDiv.html(tableContent);
            //$("form[name='livesearchForm']").find('.aui-icon.aui-icon-wait').removeClass("aui-icon-wait").addClass("aui-iconfont-search");
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
                    $.when(createPageProperty(AJS.params.pageId, propertyKey, {})).done(function() {
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
        initializeLightbox();
    }

    function showHideConfigMenu() {
        $("button#configuration-toggle").click(function () {
            $("div.toggle").toggle();
        });
    }

    function initializeLightbox() {
        var inlineDialog = $('aui-inline-dialog2.aui-inline-dialog');
        inlineDialog.live("aui-layer-show", function(e) {

            var $current = $(this),
                content = $current.find("div#dialog-content"),
                issueKey = $current.prop('id').split("_")[1];

            $.when(getPageProperty(AJS.params.pageId, "lightboxTemplate"), getIssueFromJira(issueKey)).done(function(temp, issues) {

                var template = Handlebars.compile(temp[0].value.template);
                var issue = $.parseJSON(issues[0].message).issues[0];
                content.html(template(issue));
                $current.show()
            });
        });

        inlineDialog.live("aui-layer-hide", function() {
            //inlineDialog.remove();
        });

        inlineDialog.find("button.close-dialog-button").live("click", function() {
            $("aui-inline-dialog2#" + $(this).attr("aria-dialog-id")).hide();
        });
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
                    "type":"string",
                    "system":"status"
                },
                "name":"Status"};
            var keyField = {
                "schema":{
                    "type":"string",
                    "system":"key"
                },
                "name":"Key"};

            var searchFields = [],
                allFields = [statusField, keyField];

            $.each(metadata.projects[0].issuetypes[0].fields, function(key, field) {
                AJS.log("field: " + field);

                if (Object.has(field['schema'], 'system') && field.schema.system == "summary") {
                    searchFields.push(field);
                }
                // Search in custom text fields
                else if (Object.has(field['schema'], 'custom') && field.schema.custom.indexOf("text") > 0) {
                    searchFields.push(field);
                }
                allFields.push(field);
            });

            initializeRenameWithData(allFields, "renamedFields");

            initializeSelectWithData(searchFields, "searchInFields");
            initializeSelectWithData(allFields, "tableFields");
            initializeSelectWithData(allFields, "lightboxFields");
        }
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
                } else if ("tableFields" == propertyKey) {
                    initializeAdvancedFieldsSelect(savedSelectedValues, fieldsArray, "select#select-table-fields", propertyKey);
                } else if ("lightboxFields" == propertyKey) {
                    initializeAdvancedFieldsSelect(savedSelectedValues, fieldsArray, "select#select-lightbox-fields", propertyKey);
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

            $select.append("<option value=\"{1}\" {2}>{3}</option>".assign((Object.has(sField['schema'], 'customId') ? sField.schema.customId : sField.schema.system), selected, sField.name));
        });

        $select.chosen({"width": "100%"}).change(function(evt, change) {
            updateContentPropertyFieldSelect(propertyKey, selectFieldSelector);
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
});