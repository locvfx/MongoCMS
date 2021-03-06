'use strict';

var helpers = {
    Template: function(template){
      return _.template( $('#' + template).html() );
    },

    removeClassesStartingWith: function(selector, prefix){
      $el = $(selector);
      var classes = $el.attr("class").split(" ").filter(function(item) {
          return item.indexOf(prefix) === -1 ? item : "";
      });
      $el.attr("class", classes.join(" "));
    },

    forceRedraw: function(obj) {
      obj.hide();
      obj.each(function() {
          this.offsetHeight;
      });
      obj.show();
    },

    isHTML: function(str) {
        var a = document.createElement('div');
        a.innerHTML = str;
        for (var c = a.childNodes, i = c.length; i--; ) {
            if (c[i].nodeType == 1) return true;
        }
        return false;
    },

    initNativeKeyboardShortcuts: function() {
        var gui = require('./gui');
        key.filter = function(){ return true } // Don't ignore input, textareas and selects

        // Copy
        key('⌘+c, ctrl+c', function(){ document.execCommand("copy") } );
        // Past
        key('⌘+v, ctrl+v', function(){ document.execCommand("paste") } );
        // Cut
        key('⌘+x, ctrl+x', function(){ document.execCommand("cut") } );

        // Dev Tools Shortcut
        key('⌘+alt+j, ctrl+alt+j', function(){
          gui.Window.get().showDevTools();
        });
    },

    initRighClickMenu: function(){
        var gui = require('./gui');

        $(function() {
          function Menu(cutLabel, copyLabel, pasteLabel) {
            var menu = new gui.Menu()

              , cut = new gui.MenuItem({
                label: cutLabel || "Cut"
                , click: function() {
                  document.execCommand("cut");
                }
              })

              , copy = new gui.MenuItem({
                label: copyLabel || "Copy"
                , click: function() {
                  document.execCommand("copy");
                }
              })

              , paste = new gui.MenuItem({
                label: pasteLabel || "Paste"
                , click: function() {
                  document.execCommand("paste");
                }
              })
            ;

            menu.append(cut);
            menu.append(copy);
            menu.append(paste);

            return menu;
          }

          var menu = new Menu(/* pass cut, copy, paste labels if you need i18n*/);
          $(document).on("contextmenu", function(e) {
            e.preventDefault();
            menu.popup(e.originalEvent.x, e.originalEvent.y);
          });
        });
    },

    renderAce: function(model){
        var DocEditView = require('./views/docEdit');

        ace.config.set("basePath", "components/ace-builds/src-noconflict/");
        // Based on: https://gist.github.com/duncansmart/5267653
        $('textarea[data-editor]').each(function () {
            var textarea = $(this);

            var mode = textarea.data('editor');

            var editDiv = $('<div>', {
                position: 'absolute',
                width: 'auto',
                height: textarea[0].scrollHeight,
                'class': textarea.attr('class'),
            }).insertBefore(textarea);

            textarea.css('display', 'none');

            var editor = ace.edit(editDiv[0]);
            editor.renderer.setShowGutter(false);
            editor.setOption({
                maxLines: Infinity
            });

            var onHeightChange = function(editDiv){
                var newHeight =
                      editor.getSession().getScreenLength()
                      * editor.renderer.lineHeight
                      + editor.renderer.scrollBar.getWidth();
                $(editor.container).height(newHeight)
                editor.resize();
            }

            var saveJSON = function(){
                var valString = editor.getSession().getValue(),
                    newObject;

                // Validate JSON String
                try {
                    newObject = $.parseJSON( valString )
                }catch(e){
                    alert("Invalid JSON: " + e);
                    return;
                }

                // Replace model with new data (keep _id)
                var id = model.get('_id')
                model.clear({silent: true});
                model.set({'_id': id}, {silent: true})
                model.set( newObject );

                DocEditView.render();
            }

            // Show Raw JSON Model
            if(model){
                var data_obj = model.toJSON();
                delete data_obj['_id'];
                editor.setValue(JSON.stringify(data_obj, null, '\t'), -1);
            }else{
                editor.getSession().setValue(textarea.val());
            }

            // editor.setAutoScrollEditorIntoView();
            editor.renderer.setShowPrintMargin(false);
            editor.getSession().setUseWrapMode(true);
            editor.getSession().on('change', onHeightChange);
            editor.getSession().setMode("ace/mode/" + mode);
            editor.setTheme("ace/theme/idle_fingers");
            onHeightChange();


            // add command for all new editors
            editor.commands.addCommand({
                name: "Toggle Fullscreen",
                bindKey: "Command-Shift-F",
                exec: function(editor) {
                    $(document.body).toggleClass("fullScreen");
                    $(editor.container).toggleClass("fullScreen-editor");
                    editor.resize();
                }
            })

            // Only hook blur handler when not rendering JSON view
            if(mode == "html"){
                editor.on('blur', function(){
                    var attr = $(editor.container).next('textarea').data('key');
                    var val = editor.getSession().getValue();

                    DocEditView.recordAttrChange(attr, val);
                });
            }

            // Hook on to save button and store json string
            if(mode == "json"){
                var saveBtn = $('.save-raw').show();

                saveBtn.on('click', function(e){
                    e.preventDefault()
                    saveJSON()
                });

                editor.commands.addCommand({
                    name: "Toggle Fullscreen",
                    bindKey: "Command-S",
                    exec: saveJSON
                });
            }
        });
    }
};

window.Helpers = helpers;
/*
  ==========================================================================
    JS Native Enhancements
  ==========================================================================
*/
if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}

// http://stackoverflow.com/a/6491615/831738
Object.getByString = function(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    s = s.replace(/,/g, '.');           // Replace commas with dot - arr.toString()
    var a = s.split('.');
    while (a.length) {
        var n = a.shift();
        if (n in o) {
            o = o[n];
        } else {
            return;
        }
    }
    return o;
}

// http://stackoverflow.com/a/19101235/831738
JSON.flatten = (function (isArray, wrapped) {
    return function (table) {
        return reduce("", {}, table);
    };

    function reduce(path, accumulator, table) {
        if (isArray(table)) {
            var length = table.length;

            if (length) {
                var index = 0;

                while (index < length) {
                    var property = path + "[" + index + "]", item = table[index++];
                    if (wrapped(item) !== item) accumulator[property] = item;
                    else reduce(property, accumulator, item);
                }
            } else accumulator[path] = table;
        } else {
            var empty = true;

            if (path) {
                for (var property in table) {
                    var item = table[property], property = path + "." + property, empty = false;
                    if (wrapped(item) !== item) accumulator[property] = item;
                    else reduce(property, accumulator, item);
                }
            } else {
                for (var property in table) {
                    var item = table[property], empty = false;
                    if (wrapped(item) !== item) accumulator[property] = item;
                    else reduce(property, accumulator, item);
                }
            }

            if (empty) accumulator[path] = table;
        }

        return accumulator;
    }
}(Array.isArray, Object));

/*
  ==========================================================================
    jQuery Native Enhancements
  ==========================================================================
*/
$.fn.isOnScreen = function(offsetBottom){
    var win = $(window);

    if(!offsetBottom) offsetBottom = 0;
    var viewport = {
        top : win.scrollTop() + offsetBottom,
        left : win.scrollLeft()
    };

    viewport.right = viewport.left + win.width();
    viewport.bottom = viewport.top + win.height();

    var bounds = this.offset();
    bounds.right = bounds.left + this.outerWidth();
    bounds.bottom = bounds.top + this.outerHeight();

    return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

};
