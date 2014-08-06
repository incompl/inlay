/* jshint node:true */

module.exports = function(grunt) {

  var fs = require('fs');
  var path = require('path');
  var os = require('os');
  var mkdirp = require('mkdirp');
  var marked = require('marked');
  var combyne = require('combyne');
  var stylus = require('stylus');
  var frontmatter = require('front-matter');

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

      var filePath = path.join(options.src, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        return;
      }

      var content = frontmatter(
        fs.readFileSync(filePath, {encoding: 'utf8'}));

      // Header
      var html = templates['header.combyne'].render({
        title: 'Cool Site'
      });

      // Use a layout
      if (content.attributes.layout) {
        var layoutStru = fs.readFileSync(
          path.join('structure', content.attributes.layout),
          {encoding: 'utf8'});
        html += stru(layoutStru, options, stru(content.body, options));
      }

      // No layout
      else {
        html += stru(content.body, options);
      }

      // Footer
      html += templates['footer.combyne'].render();

      // Write html file
      var destFile = file.replace(/\.\w+/, '.html');
      fs.writeFileSync(path.join(options.dest, destFile), html);
      grunt.log.ok(file, ' -> ', destFile);
    });

  });

  function stru(string, options, content) {
    var html = '';
    var indentSize = 2;
    var lastIndent = 0;
    var lineNum = 0;
    var stack = [];
    var htmlQueue = null;
    var startingNewBlock = false;
    var markdownQueue = null;
    var inMarkdown = false;

    var lines = string.split(os.EOL);
    lines.forEach(function(line) {
      lineNum++;

      var isMarkdown = line.match(/^\s*[@&]/) === null;
      var lineContent = line.match(/^\s*(.*)/)[1];

      // Ignore blank lines
      if (line.match(/^\s*$/) && !inMarkdown) {
        return;
      }

      // If we're in a markdown block, carry on until it's done
      if (inMarkdown) {
        if (isMarkdown) {
          markdownQueue += os.EOL + lineContent;
          return;
        }
        else {
          html += '<div>' + inlineMarkdown(markdownQueue) + '</div>';
          inMarkdown = false;
        }
      }

      // Parse line
      var lineInfo = line.match(/^(\s*)(.)(.*)$/);
      if (lineInfo === null && !inMarkdown) {
        error('Syntax error', lineNum, line);
      }
      var lineIndent = lineInfo[1];
      var lineCommand = lineInfo[2];
      var lineOptions = lineInfo[3];
      var isDirective = lineCommand === '&';
      var directiveName;
      var directive;
      if (isDirective) {
        directiveName = lineOptions.split(/\s/)[1];
        directive = directives[directiveName];
        if (directive === undefined) {
          error('Unknown property "' + directiveName + '"', lineNum, line);
        }
      }

      // Check indent level
      var thisIndent = lineIndent.length;
      var indentDiff = lastIndent - thisIndent;
      if (indentDiff % indentSize !== 0) {
        error('Wrong indent level', lineNum, line);
      }
      var popCount = indentDiff / indentSize;

      // De-indenting will trigger closing of html elements
      while (popCount > 0) {
        html = pop(stack, html);
        popCount--;
      }
      lastIndent = thisIndent;

      // things that modify the current block

      // CSS Style
      if (isDirective && directive.modifyBlock) {
        htmlQueue = directive.modifyBlock(htmlQueue,
                                          lineOptions,
                                          lineNum,
                                          line);
        return;
      }

      // We're not modifying the current block, so we can spit out
      // the html to start this block
      if (startingNewBlock) {
        html += htmlQueue;
        htmlQueue = null;
        startingNewBlock = false;
      }

      // creating a new block
      if (lineCommand === '@') {
        var openingTag = createOpeningTag(lineOptions);
        htmlQueue = openingTag.tag;
        stack.push(openingTag.element);
        startingNewBlock = true;
      }
      else if (isDirective && directive.modifyContent) {
        html += directive.modifyContent(lineOptions, lineNum, line);
      }
      else if (isDirective && directiveName === 'content') {
        html += '<div>' + content + '</div>';
      }
      else if (isMarkdown) {
        markdownQueue = lineContent;
        inMarkdown = true;
      }

    });

    // Write out any still-pending markdown
    if (inMarkdown) {
      html += inlineMarkdown(markdownQueue);
      inMarkdown = false;
    }

    // We're done, close any still-open html elements
    while (stack.length > 0) {
      html = pop(stack, html);
    }

    return html;

  }

  // On indentation decrease, close html elements
  function pop(stack, html) {
    var type = stack.pop();
    html += '</' + type + '>';
    return html;
  }

  var included = {};

  // Handle an "include" command and return the included html
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
      string = fs.readFileSync(path.join('content', 'partial', file),
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

  // Return the CSS for a style parameter
  function paramStyle(options, lineNum, line) {
    var ops = options.trim().split(/\s+/);
    var command = ops[1];
    var arg = ops[2];
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

  function createOpeningTag(lineOptions) {
    var element = lineOptions.match(/^\s*([\w-_]+)/);
    element = element === null ? 'div' : element[1];
    var cssClass = lineOptions.match(/\.([\w-_]+)/);
    cssClass = cssClass === null ? 'stru' : 'stru ' + cssClass[1];
    var id = lineOptions.match(/#([\w-_]+)/);
    id = id === null ? '' : ' id="' + id[1] + '"';
    return {
      element: element,
      tag: '<' + element + id +
      ' style="" class="' + cssClass + '">'
    };
  }

  function inlineMarkdown(str) {
    // if it is just one line, don't wrap with <p></p>
    var isOneLine = str.match(/[\n\r]./) === null;
    var html = marked(str);
    if (isOneLine) {
      html = html.replace(/<p>|<\/p>/g, '');
    }
    return html;
  }

  // Print out an error message and stop execution immidiately
  function error(msg, lineNum, line) {
    grunt.fail.fatal(msg + ' on line ' + lineNum + ': "' + line + '"');
  }

  var directives = {

    'css': {
      modifyBlock: function(html, lineOptions, lineNum, line) {
        html = html.replace(/style="([^"]*)"/,
            function(match, p1) {
          return 'style="' + p1 +
                 paramStyle(lineOptions, lineNum, line) + '"';
        });
        return html;
      }
    },

    'collapse': {
      modifyBlock: function(html, lineOptions, lineNum, line) {
        var unique = 'bp' + Math.round(Math.random() * 1000000);
        html = html.replace(/<div/,
            function(match, p1) {
          var maxWidth = lineOptions.replace(/collapse\s*/, '');
          return '<style>@media(max-width:' + maxWidth + ')' +
                 '{.' + unique + ' {display: block;}}</style><div';
        });
        html = html.replace(/class="([^"]*)"/,
            function(match, p1) {
          return 'class="' + p1 + ' ' + unique + '"';
        });
        return html;
      }
    },

    'include': {
      modifyContent: function(lineOptions, lineNum, line) {
        return include(lineOptions, lineNum, line);
      }
    },

    'content': {

    }
  };

};
