# stru

## Introduction

## Syntax

The following is a simple example of the syntax.

  @ header

    @ .left
      & grow 1

      # Cool Site

    @ .right
      & justify-content flex-end

      [Sign In](http://example.com)

There are three types of lines here, covered in the next 3 sections.

### Blocks

Lines that start with `@` are called "blocks". Generally these map to a single HTML element, but there are times when block will correspond to a more complicated HTML structure. In any case, the outermost HTML element of the block will match the optional CSS selector given to the right of the `@` symbol. Right now only element, class, and ID selectors are valid. The following are valid block specifiers and the HTML they generate:

| Input          | Output                                |
| -------------- | ------------------------------------- |
| @              | &lt;div>...&lt;/div>                  |
| @ div          | &lt;div>...&lt;/div>                  |
| @ .foo         | &lt;div class="foo">...&lt;/div>      |
| @ #bar         | &lt;div id="bar">...&lt;/div>         |
| @ header.fancy | &lt;header class="fancy">...&lt;/div> |
| @ nav#left     | &lt;nav id="left">...&lt;/div>        |

Blocks can be nested inside other blocks.

### Properties

Lines that start with `&` are called "properties". Properties modify the Block that they follow and are indented from the block. There are two main things that properties do:

* Modify the parent Block HTML and CSS
* Include content inside the parent Block

The first word after the `&` is the Property name. After that comes any arguments, which vary from Property to Property.

Perhaps the most basic Property is the `css` Property. It simply allows you to apply any arbitrary css to the property. For example:

  @ div
    & css max-width 30em

The preceding code will generate something similar to this:

  &lt;div style="max-width: 30em;">...&lt;/div>

Aside: In the future, this may not be implemented as an inline style because it can cause problems with [specificity](http://css-tricks.com/specifics-on-css-specificity/).

Another common Property is `include`. While `css` modifies the parent block, `include` modifies the _contents_ of the block. Specifically, `include` puts the contents of an external file into a block. If that external file is Markdown, the Markdown is compiled into HTML. For example:

  @ div
    & css max-width 30em
    & include book.md

Let's say the content of book.md is this line:

  [Home](http://incompl.com)

Then the preceding code will compile to:

  &lt;div style="max-width: 30em;">
    &lt;a href="http://incompl.com">Home&lt;/a>
  &lt;/div>

A lot of the magic comes from the many Properties that are provided. Check out the full list [here](#).

### Content

Any line that doesn't start with `@` or `&` is Content. By default Content is assumed to be in Markdown format. However, the `html` Property specifies that content in that Block is in HTML format.

In the previous example we used `& include book.md` but we could include that Markdown as Content instead of including it from a separate file:

  @ div
    & css max-width 30em
    [Home](http://incompl.com)

This produces the same HTML as the previous example.

If you want to include HTML you can do this:

  @ div
    & css max-width 30em
    & html
    &lt;a href="http://incompl.com">Home&lt;/a>

There is also a Property called `text` in case you want to include plain text Content. This is useful to avoid the `&lt;p>` element that Markdown wraps around plain text.

## Property List

### & css {property} {value}

### & html

### & text

### & markdown
