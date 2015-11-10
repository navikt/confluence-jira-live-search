AJS.toInit(function ($) {
    $.support.cors = true;

    $('#search').keyup(function () {
        var $input = $(this),
            $form = $input.closest('form'),
            $searchButton = $form.find('.aui-icon.aui-iconfont-search'),
            searchField = $('#search').val(),
            project = $('#project').val(),
            issueType = $('#issueType').val(),
            fields = "summary, Tekst bokmål, Tekst nynorsk, Brukt i mal, Eier";

        if (searchField.length > 2) {

            $searchButton.addClass("aui-icon-wait").removeClass("aui-iconfont-search");

            var header = '<thead><tr><th class="aui-table-column-issue-key">Key</th><th>Navn</th><th>Tekst bokmål</th><th>Tekst nynorsk</th><th>Brukt i mal</th><th>Eier</th></tr></thead><tbody><tr>';
            var output;
            var count = 1;

            $.ajax({
                url: "/rest/jiralivesearch/1/search",
                cache: false,
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify({
                    searchString: encodeURIComponent(searchField),
                    projectKey: encodeURIComponent(project),
                    issueTypes: encodeURIComponent(issueType),
                    fields: fields
                }),
                success: function (data) {
                    $.each($.parseJSON(data.value).issues, function (key, val) {

                        output += '<td><a href="http://jira.adeo.no/browse/' + val.key + '" target="_new">' + val.key + '</a></td>'
                        output += '<td>' + val.fields.summary + '</td>'
                        output += '<td>' + escapeHtml(val.fields.customfield_15213).replace(/(?:\r\n|\r|\n)/g, '<br />') + '</td>'
                        output += '<td>' + val.fields.customfield_15214 + '</td>'
                        output += '<td>' + val.fields.customfie|                        ld_15215.replace(/(?:\r\n|\r|\n)/g, '<br />'); + '</td>'
                        output += '<td>' + val.fields.customfield_10514 + '</td>'

                        output += '</tr><tr>'
                        count++;
                    });

                    output += '</tr></tbody>';
                    var find = searchField;
                    var re = new RegExp(find, 'gi');
                    $('table#search-jira-results').html(header + output.replace(re, '<b style=\"background-color:yellow;\">' + find.replace('*', '') + '</b>'));

                    $searchButton.removeClass("aui-icon-wait").addClass("aui-iconfont-search");

                    AJS.tablessortable.setTableSortable(AJS.$("table#search-jira-results"));
                },
                error: function (x, y, z) {
                    $searchButton.removeClass("aui-icon-wait").addClass("aui-iconfont-search");
                },
                timeout: 30000
            });
        }
    });

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