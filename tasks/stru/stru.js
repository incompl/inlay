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
      var fileContent = fs.readFileSync(path.join(options.src, file),
                                       {encoding: 'utf8'});

      var html = templates['header.combyne'].render({
        title: 'Cool Site'
      });

      html += stru(fileContent, options);

      html += templates['footer.combyne'].render();

      var destFile = file.replace('.stru', '.html');
      fs.writeFileSync(path.join(options.dest, destFile), html);
      grunt.log.ok(file, ' -> ', destFile);
    });

  });

  function stru(string, options) {
    var html = '';
    var indentSize = 2;
    var lastIndent = 0;
    var lineNum = 0;
    var stack = [];
    var htmlQueue = null;

    var lines = string.split(os.EOL);
    lines.forEach(function(line) {
      lineNum++;
      if (line.match(/^\s*$/)) {
        return;
      }
      var lineInfo = line.match(/^(\s*)((.)(.*))$/);
      if (lineInfo === null) {
        error('Syntax error', lineNum, line);
      }
      var lineIndent = lineInfo[1];
      var lineContent = lineInfo[2];
      var lineCommand = lineInfo[3];
      var lineOptions = lineInfo[4];
      var isInclude = lineContent.match(/^&\s*include/) !== null;
      var isCollapse = lineContent.match(/^&\s*collapse/) !== null;

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
        if (lineCommand === '&' && !isInclude && !isCollapse) {
          htmlQueue = htmlQueue.replace(/style="([^"]*)"/,
              function(match, p1) {
            return 'style="' + p1 +
                   paramStyle(lineOptions, lineNum, line) + '"';
          });
        }
        else if (lineCommand === '&' && isCollapse) {
          var unique = 'bp' + Math.round(Math.random() * 1000000);
          htmlQueue = htmlQueue.replace(/<div/,
              function(match, p1) {
            var maxWidth = lineOptions.replace(/collapse\s*/, '');
            return '<style>@media(max-width:' + maxWidth + ')' +
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

      if (lineCommand === '@') {
        htmlQueue = '<div style="" class="stru' + lineOptions + '">';
        stack.push('row');
      }
      else if (isInclude) {
        if (htmlQueue !== null) {
          htmlQueue = htmlQueue.replace(/class="stru/, 'class="');
        }
        html += include(lineContent, lineNum, line);
      }
      else if (lineCommand.match(/^[@&]/) === null) {
        html += marked(lineContent);
      }

    });

    while (stack.length > 0) {
      html = pop(stack, html);
    }

    return html;

  }

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

  function include(command, lineNum, line) {
    var html;
    var string;
    var commandInfo = command.match(/\s*include\s*(\w+\.(\w+))/);
    if (commandInfo === null) {
      error('Invalid include syntax', lineNum, line);
    }
    var file = commandInfo[1];
    var extension = commandInfo[2];

    if (included[file] !== undefined) {
      return included[file];
    }

    if (extension === 'md') {
      string = fs.readFileSync(path.join('content', file),
                                     {encoding: 'utf8'});
      html = '<div>' + marked(string) + '</div>';
      included[file] = html;
      return html;
    }
    else if (extension === 'stru') {
      string = fs.readFileSync(path.join('content', file),
                                   {encoding: 'utf8'});
      html = '<div>' + stru(string) + '</div>';
      included[file] = html;
      return html;
    }
    else {
      error('Unknown file type', lineNum, line);
    }
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
