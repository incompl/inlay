![](http://www.omgwiki.org/model-interchange/lib/exe/fetch.php?cache=cache&media=under-construction.gif)

This project is in an experimental prototyping phase. Please don't try to use it yet. Get in touch with me on Twitter at [@_gsmith](https://twitter.com/_gsmith) if you have questions.

# stru

A markup format for layout.

## Introduction

As you know, the separation of HTML and CSS allows you to separate your _content_ and _style_. As websites have gotten more complex, a third concern has emerged: _layout_. As things stand, the layout of a page is described in both the HTML _and_ the CSS. Many CSS best-practices such as [OOCSS](https://github.com/stubbornella/oocss/wiki) deal with the separation of layout and style. This helps deal with the problem but doesn't fix it.

This project is a new markup format for reusable layouts that can be used with content and styles defined elsewhere. It is intended to compliment HTML and CSS. Your HTML and CSS will be simpler because they won't be burdened with layout information. STRU plays well with Markdown; you may not need to write much HTML, if any.

## Syntax

The following is a simple example of the syntax.

```
@ header

  @ .left
    & grow 1

    # Cool Site

  @ .right
    & justify-content flex-end

    [Sign In](http://example.com)
```

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

#### Properties that modify the Block

Perhaps the most basic Property is the `css` Property. It simply allows you to apply any arbitrary css to the Block. For example:

```
@ div
  & css max-width 30em
```

The preceding code will generate something similar to this:

```
<div style="max-width: 30em;">...</div>
```

Aside: In the future, this may not be implemented as an inline style because it can cause problems with [specificity](http://css-tricks.com/specifics-on-css-specificity/).

#### Properties that modify the Content

Another common Property is `include`. While `css` modifies the parent block, `include` modifies the _contents_ of the block. Specifically, `include` puts the contents of an external file into a block. If that external file is Markdown, the Markdown is compiled into HTML. For example:

```
@ div
  & css max-width 30em
  & include book.md
```

Let's say the content of book.md is this line:

```
[Home](http://incompl.com)
```

Then the preceding code will compile to:

```
<div style="max-width: 30em;">
  <a href="http://incompl.com">Home</a>
</div>
```

A lot of the magic comes from the many Properties that are provided. Check out the full list [here](#).

### Content

Any line that doesn't start with `@` or `&` is Content. By default Content is assumed to be in Markdown format. However, the `html` Property specifies that content in that Block is in HTML format.

In the previous example we used `& include book.md` but we could include that Markdown as Content instead of including it from a separate file:

```
@ div
  & css max-width 30em
  [Home](http://incompl.com)
```

This produces the same HTML as the previous example.

If you want to include HTML you can do this:

```
@ div
  & css max-width 30em
  & html
  <a href="http://incompl.com">Home</a>
```

There is also a Property called `text` in case you want to include plain text Content. This is useful to avoid the `<p>` element that Markdown wraps around plain text.

## Property List

### & css {property} {value}

Add the given CSS property and value to this block.

### & html

Specifies that the content of this block is HTML.

### & text

Specifies that the content of this block is plain text.

### & markdown

Specifies that the content of this block is in Markdown format. Markdown is the default, but sometimes you may want to be explicit. It's fun.

### & collapse {css width}

Collapse this block if the viewport is narrower than {css width}. This is implemented using media queries. It is the primary method for creating responsive layouts.

### & include {file name}

Include the contents of {file name} as the content for this block. Valid file formats are:

* Markdown (.md)
* HTML (.html)
* Text (.txt)

### & content

(should be renamed)

If this STRU file is being used as a layout in the front matter of another document, the content of that document is put in this block.
