/* jshint node:true */

module.exports = function(grunt) {

  var fs = require('fs');
  var path = require('path');
  var os = require('os');
  var _ = require('underscore');
  var mkdirp = require('mkdirp');
  var marked = require('marked');
  var combyne = require('combyne');
  var stylus = require('stylus');

  var templates = {};

  var templatesPath = path.join('tasks', 'stru', 'html');
  fs.readdirSync(templatesPath).forEach(function(file) {
    var templ = fs.readFileSync(path.join(templatesPath, file),
                                {encoding: 'utf8'});
    templates[file] = combyne(templ);
  });

  grunt.registerTask('stru', 'ineffable', function() {

    // Default options
    var options = this.options({

    });

    // Check options
    if (options.src === undefined) {
      grunt.fail.fatal('No stru src');
    }
    if (options.dest === undefined) {
      grunt.fail.fatal('No stru dest');
    }

    // Create needed directories
    mkdirp.sync(options.dest);
    mkdirp.sync(path.join('artifacts', 'css'));

    // Compile our stylus
    var styl = fs.readFileSync(
      path.join('tasks', 'stru', 'css', 'stru.stylus'),
      {encoding: 'utf8'});
    var css = stylus(styl).render();
    fs.writeFileSync(path.join('artifacts', 'css', 'stru.css'), css);

    // Compile user stylus
    styl = fs.readFileSync(
      path.join('skin', 'main.stylus'),
      {encoding: 'utf8'});
    css = stylus(styl).render();
    fs.writeFileSync(path.join('artifacts', 'css', 'main.css'), css);

    // Copy our normalize css
    fs.writeFileSync(
      path.join('artifacts', 'css','normalize.css'),
      fs.readFileSync(
        path.join('node_modules', 'normalize.css', 'normalize.css'))
    );

    // Interpret our STRU files
    fs.readdirSync(options.src).forEach(function(file) {
      var html = templates['header.combyne'].render({
        title: 'Cool Site'
      });
      var indentSize = 2;
      var lastIndent = 0;
      var lineNum = 0;
      var stack = [];
      var htmlQueue = null;
      var stru = fs.readFileSync(path.join(options.src, file),
                                 {encoding: 'utf8'});
      var lines = stru.split(os.EOL);
      lines.forEach(function(line) {
        lineNum++;
        if (line.match(/^\w*$/)) {
          return;
        }
        var lineInfo = line.match(/^(\s*)([-|@#!])(.*)$/);
        if (lineInfo === null) {
          error('Syntax error', lineNum, line);
        }
        var lineIndent = lineInfo[1];
        var lineCommand = lineInfo[2];
        var lineOptions = lineInfo[3];

        var thisIndent = lineIndent.length;
        var indentDiff = lastIndent - thisIndent;
        if (indentDiff % indentSize !== 0) {
          error('Wrong indent level', lineNum, line);
        }
        var popCount = indentDiff / indentSize;
        while (popCount > 0) {
          html = pop(stack, html);
          popCount--;
        }
        lastIndent = thisIndent;

        if (htmlQueue !== null) {
          if (lineCommand === '#') {
            htmlQueue = htmlQueue.replace(/style="([^"]*)"/,
                function(match, p1) {
              return 'style="' + p1 +
                     paramStyle(lineOptions, lineNum, line) + '"';
            });
          }
          else if (lineCommand === '!') {
            var unique = 'bp' + Math.round(Math.random() * 1000000);
            htmlQueue = htmlQueue.replace(/<div/,
                function(match, p1) {
              return '<style>@media(max-width:' + lineOptions + ')' +
                     '{.' + unique + ' {display: block;}}</style><div';
            });
            htmlQueue = htmlQueue.replace(/class="([^"]*)"/,
                function(match, p1) {
              return 'class="' + p1 + ' ' + unique + '"';
            });
          }
          else {
            html += htmlQueue;
            htmlQueue = null;
          }
        }

        if (lineCommand === '-') {
          htmlQueue = '<div style="" class="row' + lineOptions + '">';
          stack.push('row');
        }
        else if (lineCommand === '|') {
          htmlQueue = '<div style="" class="col' + lineOptions + '">';
          stack.push('col');
        }
        else if (lineCommand === '@') {
          if (_(stack).last() === 'row') {
            error('Include cannot be child of Row', lineNum, line);
          }
          html += include(lineOptions);
        }

      });

      while (stack.length > 0) {
        html = pop(stack, html);
      }

      var destFile = file.replace('.stru', '.html');

      html += templates['footer.combyne'].render();

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

  var included = {};

  function include(file) {
    file = file.trim();
    if (included[file] !== undefined) {
      return included[file];
    }
    var markdown = fs.readFileSync(path.join('content', file),
                               {encoding: 'utf8'});
    var html = marked(markdown);
    included[file] = html;
    return html;
  }

  function paramStyle(options, lineNum, line) {
    var ops = options.trim().split(/\s+/);
    var command = ops[0];
    var arg = ops[1];
    if (command === 'grow') {
      return 'flex-grow: ' + arg + ';';
    }
    if (command === 'shrink') {
      return 'flex-shrink: ' + arg + ';';
    }
    else if (command === 'basis') {
      return 'flex-basis: ' + arg + ';';
    }
    else if (command === 'direction') {
      return 'flex-direction: ' + arg + ';';
    }
    else {
      return command + ':' + arg + ';';
    }
  }

  function error(msg, lineNum, line) {
    grunt.fail.fatal(msg + ' on line ' + lineNum + ': "' + line + '"');
  }

};
