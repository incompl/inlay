module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    stru: {
      options: {
        src: 'structure',
        dest: 'dest'
      }
    }

  });

  grunt.loadTasks('tasks');

  // Load the plugin that provides the "uglify" task.
  // grunt.loadNpmTasks('stru');

  // Default task(s).
  grunt.registerTask('default', ['stru']);

};
