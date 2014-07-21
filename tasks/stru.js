/* jshint node:true */

module.exports = function(grunt) {

  var fs = require('fs');
  var path = require('path');
  var os = require('os');

  grunt.registerTask('stru', 'ineffable', function() {

    var options = this.options({

    });

    if (options.src === undefined) {
      grunt.fail.fatal('No stru src');
    }
    if (options.dest === undefined) {
      grunt.fail.fatal('No stru dest');
    }

    fs.readdirSync(options.src).forEach(function(file) {
      var html = '';
      var lastIndent = 0;
      var lineNum = 0;
      var stack = [];
      var stru = fs.readFileSync(path.join(options.src, file),
                                 {encoding: 'utf8'});
      var lines = stru.split(os.EOL);
      lines.forEach(function(line) {
        lineNum++;
        if (line.match(/^\w*$/)) {
          return;
        }
        var lineInfo = line.match(/^(\s*)([-|@])(.*)$/);
        var lineIndent = lineInfo[1];
        var lineCommand = lineInfo[2];
        var lineOptions = lineInfo[3];
        if (lineInfo === null) {
          grunt.fail.fatal('Syntax error on line ' + lineNum +
                           ': "' + line + '"');
        }

        var thisIndent = lineIndent.length;
        if (thisIndent > lastIndent) {

        }
        else if (thisIndent < lastIndent) {
          html = pop(stack, html);
        }
        lastIndent = thisIndent;

        if (lineCommand === '-') {
          html += '<div class="row">';
          stack.push('row');
        }
        else if (lineCommand === '|') {
          html += '<div class="col">';
          stack.push('col');
        }
        else if (lineCommand === '@') {
          html += lineOptions;
        }

      });

      while (stack.length > 0) {
        html = pop(stack, html);
      }

      var destFile = file.replace('.stru', '.html');

      fs.writeFileSync(path.join(options.dest, destFile), html);

      grunt.log.ok(file, '->', destFile);

    });

  });

  function pop(stack, html) {
    var type = stack.pop();
    if (type === 'row') {
      html += '</div>';
    }
    else if (type === 'col') {
      html += '</div>';
    }
    else {
      grunt.fail.fatal('Unknown context: ' + type);
    }
    return html;
  }

};
