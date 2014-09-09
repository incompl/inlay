module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    clean: [
      'artifacts',
      'dest'
    ],

    inlay: {
      options: {
        src: 'content',
        dest: 'dest'
      }
    },

    concat_css: {
      options: {},
      all: {
        src: [
          'artifacts/css/normalize.css',
          'artifacts/css/inlay.css',
          'artifacts/css/main.css'
        ],
        dest: 'dest/style.css'
      },
    },

  });

  grunt.loadTasks('tasks/inlay');

  grunt.loadNpmTasks('grunt-concat-css');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('fresh', ['clean', 'default']);
  grunt.registerTask('default', ['inlay', 'concat_css']);

};
