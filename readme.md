# Searchomatic
*Section-based weighted page search with filtering for JavaScript/jQuery*

A class that scans blocks of content within a container, then shows/hides and orders them based on the occurrence of words in them. Different elements can be given different weights and can optionally be used as tags to filter by or used to generate autocomplete suggestions.  Supports minimum word length, word ignore list, regex-based word substitution and more.

```javascript
var searcher = new Searchomatic({
   
    container       : "#searchThis",
    section         : "div.section",
    filterContainer : "#filters",
    
    content : {
        "h2"                : { weight:  2,
                                suggest: true },

        "div.body"          : { weight:  1 },

        "div.keywords"      : { weight:  4 },

        "ul.categories li"  : { filter:  true,
                                suggest: true } 
});

$("button").click(function()
{
    searcher.search( $("input").val() );
});
```


Until I sort out the examples or readme (or even, god forbid, some docs) properly, the best thing to do is probably to check out the source, particularly stuff from line 290 onwards.