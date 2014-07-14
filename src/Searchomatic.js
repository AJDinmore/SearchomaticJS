function Searchomatic( options )
{
    this.setIgnoreNumbers( true );

    if( options )
        this.setOptions( options );
}

Searchomatic.prototype =
{
    // element HTML & class names
    filterElementHTML   : '<span class="filter" />',
    activeFilterClass   : "active",
    inctiveFilterClass  : "inactive",
    
    // Input filters
    ignore              : [], // TODO: add defaults?
    replace             : [],
    
    // DOM elements
    $container          : null,
    $filterContainer    : null,
    sections            : [],
    
    // Settings
    minWordLength       : 3,
    ignoreNumbers       : true,
    
    // Data
    map                 : {},
    filters             : {},
    filtersBySection    : [],
    suggestions         : {},
    
    // Regex
    stripChars          : null,
    compressWhite       : /\s+/g,
    trim                : /^\s+|\s+$/g,
    
    // Callbacks
    onFilter            : null,
    
    /************************
     * Create map & filters *
     ************************/
    
    // Index content using elements defined by selector CSS as section roots
    addSections :function( sectionSelector, contentSelectors )
    {
        var _this = this;
        
        $(sectionSelector).each(function( i, element )
        {
            _this.addSection( element, contentSelectors );
        });
    },
    
    // Add a single section to the map
    addSection :function( section, contentSelectors )
    {
        var text, options,
            _this       = this,
            sectionID   = this.sections.push( section ) - 1;
        
        for( var selector in contentSelectors )
            $( selector, section ).each(function( i, element )
            {
                text    = $(element).text();
                options = contentSelectors[selector];

                if( options.weight )
                    _this.mapText(  text,
                                    options.weight,
                                    sectionID
                                    );

                if( options.filter )
                    _this.addFilter( text, sectionID );

                if( options.suggest )
                    _this.addSuggestion( text );
            });
    },
    
    // Scan text and add section to the map for each word
    mapText :function( text, weight, sectionID )
    {
        var word,
            words = this.getWords( text );

        for( var i in words )
        {
            word = words[i];
            
            if( word.length >= this.minWordLength && this.ignore.indexOf(word) < 0 )
                this.addToMap( word, weight, sectionID );
        }
    },
    
    // Add data to the map
    addToMap :function( word, weight, sectionID )
    {
        if( !this.map[word] )
            this.map[word] = {};
        
        if( !this.map[word][sectionID] )
            this.map[word][sectionID] = 0;
        
        this.map[word][sectionID] += weight;
    },
    
    // Add data to the filter list
    addFilter :function( text, sectionID )
    {
        if( !this.filters[text] )
            this.filters[text] = [];

        this.filters[text].push( sectionID );

        if( !this.filtersBySection[sectionID] )
            this.filtersBySection[sectionID] = [];

        this.filtersBySection[sectionID].push( text );
    },

    // Add text to the suggestion list
    addSuggestion :function( text )
    {
        this.suggestions[this.prepareText(text)] = text;
    },
    
    /*******************
     * Search & filter *
     *******************/
    
    search :function( text )
    {
        var word, words, filter, resultCount,
            results         = [],
            sortedResults   = [],
            filters         = {};
        
        this.$container.children().detach();
        
        if( text && text != "" )
        {
            words = this.getWords( text );

            for( var i in words )
            {
                word = words[i];
         
                for( var sectionID in this.map[word] )
                {
                    if( !results[ sectionID ] )
                        results[ sectionID ] = 0;

                    results[ sectionID ] += this.map[word][sectionID];

                    for( var j in this.filtersBySection[sectionID] )
                    {
                        filter = this.filtersBySection[sectionID][j];
                        
                        if( !filters[filter] )
                            filters[filter] = [];
                        
                        filters[filter].push( sectionID );
                    }
                }
            }
            
            sortedResults   = this.getSortedList( results );
            resultCount     = sortedResults.length;
            
            for( var section in sortedResults )
                this.$container.append( this.sections[sortedResults[section][0]] );
        }
        else
        {
            for( var section in this.sections )
                this.$container.append( this.sections[section] );
            
            resultCount = this.sections.length;
            filters     = this.filters;
        }
        
        this.$container.children().show();
        
        this.buildFilterElements( filters, resultCount );
        
        return resultCount;
    },
    
    // create and attach elements for setting filters
    buildFilterElements :function( filters, numResults )
    {
        if( this.$filterContainer )
        {
            var _this = this;

            this.$filterContainer.empty();

            for( var filter in filters )
                if( filters[filter].length < numResults )
                    $(this.filterElementHTML)
                        .html( filter + " <span>" + filters[filter].length + "</span>" )
                        .data( "sections", filters[filter] )
                        .data( "term", filter )
                        .click(function(){  _this.filterResults( $(this) ); })
                        .appendTo( this.$filterContainer );
        }
    },
    
    // filter displayed results
    filterResults :function( $filterElement )
    {
        var sections = $filterElement.data("sections");
        
        this.$container.children().hide();
        
        for( var i in sections )
            $( this.sections[sections[i]] ).show();

        this.$filterContainer.children().addClass( this.inctiveFilterClass );
        $filterElement.removeClass( this.inctiveFilterClass ).addClass( this.activeFilterClass );
        
        if( this.onFilter )
            this.onFilter( $filterElement.data("term"), $filterElement.data("sections").length );
    },
    
    // clear set filter
    clearFilter :function()
    {
        this.$filterContainer.children().removeClass( this.activeFilterClass )
                                        .removeClass( this.inctiveFilterClass );
        
        this.$container.children().show();
        
        if( this.onFilter )
            this.onFilter();
    },
    
    /***********
     * Utility *
     ***********/
    
    // just in case word isolation method changes
    getWords :function( text )
    {
        return this.prepareText(text).split(" ");
    },
    
    // strip unwanted characters and make replacements
    prepareText :function( text )
    {
        text = this.stripText( text );
        
        for( var i in this.replace )
            text = text.replace( this.replace[i].search, this.replace[i].replace );
        
        return text;
    },
    
    // strip unwanted characters etc.
    stripText :function( text )
    {
        return text .replace( this.stripChars, "" )
                    .replace( this.compressWhite, " " )
                    .replace( this.trim, "" )
                    .toLowerCase();
    },
    
    // convert {value:weight} object to [[value,weight]] list, sorted by weight
    getSortedList :function( list )
    {
        var sortedList = [];
        
        for( var key in list )
            sortedList.push([ key, list[key] ]);
        
        sortedList.sort(function(a,b){ return b[1] - a[1]; });
        
        return sortedList;
    },
    
    /**************************
     * Stuff for UI wrangling *
     **************************/
    
    // returns an ordered array of suggestions based on a search fragment
    getSugestions :function( fragment )
    {
        var suggestion,
            words               = this.getWords( fragment );
            suggestions         = {},
            sortedSuggestions   = [];

        for( var suggestionSearch in this.suggestions )
            for( var word in words )
                if( suggestionSearch.search(word) > -1 )
                {
                    suggestion = this.suggestions[suggestion];

                    if( !suggestions[key] )
                        suggestions[key] = 0;

                    suggestions[key] += 1;
                }

        suggestions = this.getSortedList( suggestions );

        for( var i in suggestions )
            sortedSuggestions.push( suggestions[i][0] );

        return sortedSuggestions;
    },

    // returns an array of all mapped words
    // TODO: find a way to make the getMapWords functions return original text, not processed (for e.g. apostophes)
    getMapWords :function()
    {
        var words = [];
        
        for( var word in this.map )
            words.push( word );
        
        return words;
    },
    
    // returns an array of mapped words that start with the passed fragment
    getMapWordsStarting :function( fragment )
    {
        fragment  = this.stripText( fragment );
        var words = [];
        
        for( var word in this.map )
            if( word.substr(0,fragment.length) == fragment )
                words.push( word );
        
        return words;
    },

    // returns and array of mapped words that contain the passed fragment
    getMapWordsContaining :function( fragment )
    {
        fragment  = this.stripText( fragmenet );
        var words = [];

        for( var word in this.map )
            if( word.search(fragment) > -1 )
                words.push( word );

        return words;
    },
    
    /***********
     * Setters *
     ***********/

    // set many options at once
    setOptions :function( options )
    {
        if( options.container )             this.setContainer( options.container );
        if( options.minWordLength )         this.setMinWordLength( options.minWordLength );
        if( options.ignore )                this.addIgnore( options.ignore );
        if( options.regexIgnore )           this.addRegexIgnore( options.regexIgnore );
        if( options.replace )               this.addReplacements( options.replace );
        if( options.filterContainer )       this.setFilterContainer( options.filterContainer );
        if( options.filterElement )         this.setFilterElement( options.filterElement );
        if( options.ignoreNumbers )         this.setIgnoreNumbers( options.ignoreNumbers );
        if( options.activeFilterClass )     this.setActiveFilterClass( options.activeFilterClass );
        if( options.inactiveFilterClass )   this.setInactiveFilterClass( options.inactiveFilterClass );
        if( options.onFilter )              this.setOnFilterCallback( options.onFilter );

        if( options.section && options.content )
        {
            this.addSections( options.section, options.content );
            this.buildFilterElements( this.filters, this.sections.length );
        }
    },
    
    // set whether numbers should be ignored or not
    setIgnoreNumbers :function( ignore )
    {
        this.stripChars = ignore    ? /[^a-z ]+/ig
                                    : /[^a-z0-9 ]+/ig;
    },
    
    // add terms to the ignore list
    addIgnore :function( ignoreList )
    {
        for( var i in ignoreList )
            if( this.ignore.indexOf(ignoreList[i]) < 0 )
            this.ignore.push( this.prepareText( ignoreList[i] ) );
    },
    
    // add search and replace pairs to the replace list, search must be a valid reular expression
    addReplacements :function( replacementList )
    {
        for( var i in replacementList )
            this.replace.push({ search  : new RegExp(i,"ig"),
                                replace : this.prepareText(replacementList[i])
                            });
    },
    
    // set the sections container (accepts DOM element or CSS selector string)
    setContainer :function( container )
    {
        this.$container = $( container );
    },
    
    // set the filter container (accepts DOM element or CSS selector string)
    setFilterContainer :function( container )
    {
        this.$filterContainer = $( container );
    },
    
    // just in case...
    setMinWordLength        :function( minLength ){ this.minWordLength = minLength; },
    setFilterElement        :function( html ){      this.filterElementHTML = html; },
    setActiveFilterClass    :function( className ){ this.activeFilterClass = className; },
    setInactiveFilterClass  :function( className ){ this.inactiveFilterClass = className; },
    setOnFilterCallback     :function( callback ){  this.onFilter = callback; }
}; 