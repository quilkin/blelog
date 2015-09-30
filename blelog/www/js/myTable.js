

function bleTable(tableID, language, array, height, columns, callback)
{
    "use strict";

    var file = "Data List",
        oTable,
        search = true,
        compact = false;


    if (tableID === "#data") {
        compact = true;
        search = false;
    }

    // use table tools for printing options
    $(tableID + 'Table').html('<table class="display" id="' + tableID.substring(1) + '"></table>');
    oTable = $(tableID).DataTable({
            
        "dom": 'T<"clear"><"top"f>rt<"bottom"l>',
        "language": language,
        "scrollY": height,
        "filter": search,
        "tableTools": {
            "sSwfPath": "copy_csv_xls_pdf.swf",
            "aButtons": ["copy", { "sExtends": "pdf", "sTitle": file }]
        },
        "paging": false,
        "scrollCollapse": true,
        "data": array,
        "columns": columns,
        "compact": compact,
        "ordering": false,
        "deferRender": true,
        "bSortClasses": false,
        "footerCallback": callback
    });
    //}

    //else {
    //    var str = '<table class="display" id="' + tableID.substring(1) + '"></table>'
    //    $(tableID + 'Table').html(str);
    //    var oTable = $(tableID).DataTable({
    //        "dom": '<"top"f>rt<"bottom"l>',
    //        "language": language,
    //        "scrollY": height,
    //        "filter": search,
    //        "tableTools": {
    //            "fnRowSelected": function ( nodes ) {
    //                tagConnect.chooseConnection(nodes);
    //            }
    //        },

    //        //"bjQueryUI": true,
    //        "paging": false,
    //        "scrollCollapse": true,
    //        "data": array,
    //        "columns": columns,
    //        "footerCallback": callback,
    //        //"columnDefs": [{ "width": "2%", "targets": 0 }],
    //        "compact": compact,
    //        responsive: true
    //    });
    //}
    //oTable.aoColumnDefs

    return oTable;
}

