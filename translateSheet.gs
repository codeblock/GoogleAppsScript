// logging to your server
var Debug = {
    log: function (args) {
        args = encodeURIComponent(args);
        //UrlFetchApp.fetch("http(s)://${host[:${port}][${path}[/${file}]]}?dat=" + args);
        //UrlFetchApp.fetch("https://127.0.0.1:8000/log.x?param=" + args);
    }
};

var Props = {
    init: function () {
        PropertiesService.getDocumentProperties().deleteAllProperties();
    },
    valid: function (props) {
        var rtn = true;
        
        for (var i in props) {
            if (props[i] == null) { rtn = false; break; }
        }
        
        return rtn;
    },
    set: function (props, suffix) {
        for (var i in props) {
            var k = i;
            if (suffix != "") {
                k = i + "_" + suffix;
            }
            PropertiesService.getDocumentProperties().setProperty(k, props[i]);
        }
    },
    get: function (props, suffix) {
        var tmp = null;
        for (var i in props) {
            var k = i;
            if (suffix != "") {
                k = i + "_" + suffix;
            }
            tmp = PropertiesService.getDocumentProperties().getProperty(k);
            if (tmp == null) {
                PropertiesService.getDocumentProperties().setProperty(k, props[i]);
            }
            tmp = PropertiesService.getDocumentProperties().getProperty(k);
            props[i] = tmp;
        }
        
        return props;
    }
};

function translateSheet(sheet_name, lang_from, lang_to) {
  var load      = SpreadsheetApp.getActiveSpreadsheet();
  var source    = load.getSheetByName(sheet_name);
  var suffix    = "-translated";
  var activated = load.getActiveSheet();
  var props_arg = {cuts: 200, rows: 0, cols: 0, next: (1000 * 120)};
  var props     = Props.get(props_arg, source.getSheetId());
  
  for (var i in props) { props[i] = props[i] * 1; } // float -> int
  
  var target = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(source.getName() + suffix);
  if (target != null && props.rows == 0) {
    Debug.log("delete: " + target.getName());
    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(target);
  }
  
  if (props.rows == 0) {
    target = source.copyTo(load);
    Debug.log("copy: " + target.getName());
    target.setName(source.getName() + suffix);
    Debug.log("rename: " + target.getName());
    //target.activate();
  }
  
  var regexp = /[^a-zA-Z0-9`~!@#$%^&*()-_=+\[\]{}\\|:;'",<.>\/?\s]/;
  var range  = target.getDataRange();
  
  var i     = 0;
  var j     = 0;
  var i_len = props.rows + Math.min(props.cuts, range.getNumRows() - props.rows);
  var j_len = props.cols + Math.min(props.cuts, range.getNumColumns() - props.cols);
  
  var percent_s = Math.ceil(100 / range.getNumRows() * props.rows);
  var percent_e = Math.ceil(100 / range.getNumRows() * i_len);
  var percent   = percent_s + " % ~ " + percent_e + " %";
  Debug.log("ranges: " + props.rows + " ~ " + i_len + " / " + range.getNumRows() + " (" + percent + ")");
  
  for (i = props.rows; i < i_len; i++) {
    for (j = 0; j < j_len; j++) {
      var cell = range.offset(i, j, 1, 1);
      data = cell.getValue();
      if (regexp.test(data)) {
        var trans = LanguageApp.translate(data, lang_from, lang_to);
        cell.setValue(trans);
      }
    }
  }
  
  props.rows = i;
  props.cols = j;
  
  if (range.getNumRows() == props.rows && range.getNumColumns() == props.cols) {
    props.rows = 0;
    props.cols = 0;
    Props.set(props, source.getSheetId());
    Debug.log("finished: " + target.getName());
  } else {
    Props.set(props, source.getSheetId());
    
    var func = "";
    if (sheet_name == "sheet_00") {
      func = "translateSheet_sheet_00";
    } else if (sheet_name == "sheet_01") {
      func = "translateSheet_sheet_01";
    }
    
    initTrigger(); // for too many triggers
    ScriptApp.newTrigger(func)
             .timeBased()
             .after(props.next)
             .create();
    Debug.log("continue after " + (props.next / 1000) + " seconds");
  }
  
  //activated.activate();
}

function init() {
    initTrigger();
    Props.init();
}

function initTrigger() {
    var triggers = ScriptApp.getProjectTriggers();

    for (var i in triggers) {
        if (triggers[i].getHandlerFunction() != "doStart") {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }
}


/*
 * function definitions for translation
 */
function translateSheet_sheet_00() { translateSheet("sheet_00", "ko", "en"); }
function translateSheet_sheet_01() { translateSheet("sheet_01", "ko", "zh"); }


/*
 * should be added to trigger at first - doStart, time based, hours timer, 12 hour terms (, optional notify when trigger failure)
 * start translation
 */
function doStart() {
  init();
  translateSheet_sheet_00();
  translateSheet_sheet_01();
}