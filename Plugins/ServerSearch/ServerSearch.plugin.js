//META{"name":"ServerSearch","displayName":"ServerSearch","website":"https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/ServerSearch","source":"https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/ServerSearch/ServerSearch.plugin.js"}*//
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

var ServerSearch = (() => {
    const config = {"info":{"name":"ServerSearch","authors":[{"name":"Zerebos","discord_id":"249746236008169473","github_username":"rauenzi","twitter_username":"ZackRauen"}],"version":"0.1.2","description":"Adds a button to search your servers. Search in place or in popout. Support Server: bit.ly/ZeresServer","github":"https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/ServerSearch","github_raw":"https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/ServerSearch/ServerSearch.plugin.js"},"defaultConfig":[{"type":"radio","id":"inPlace","name":"Search Style","value":false,"options":[{"name":"Popout","value":false,"desc":"Shows a popout with a list of guilds to search."},{"name":"In Place","value":true,"desc":"Hides guilds in the list that don't match the search."}]}],"changelog":[{"title":"Bugs Squashed","type":"fixed","items":["Button now appears.","Menu closes when you leave it.","Searching actually works.","Wow."]}],"main":"index.js"};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            const title = "Library Missing";
            const ModalStack = BdApi.findModuleByProps("push", "update", "pop", "popWithKey");
            const TextElement = BdApi.findModuleByProps("Sizes", "Weights");
            const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() == "confirm-modal");
            if (!ModalStack || !ConfirmationModal || !TextElement) return BdApi.alert(title, `The library plugin needed for ${config.info.name} is missing.<br /><br /> <a href="https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js" target="_blank">Click here to download the library!</a>`);
            ModalStack.push(function(props) {
                return BdApi.React.createElement(ConfirmationModal, Object.assign({
                    header: title,
                    children: [BdApi.React.createElement(TextElement, {color: TextElement.Colors.PRIMARY, children: [`The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`]})],
                    red: false,
                    confirmText: "Download Now",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                            if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                            await new Promise(r => require("fs").writeFile(require("path").join(ContentManager.pluginsFolder, "0PluginLibrary.plugin.js"), body, r));
                        });
                    }
                }, props));
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {DiscordSelectors, PluginUtilities, ColorConverter, WebpackModules, DiscordModules, ReactTools, Utilities, Structs: {Screen}} = Api;

    const SortedGuildStore = DiscordModules.SortedGuildStore;
    const ImageResolver = DiscordModules.ImageResolver;
    const GuildActions = DiscordModules.GuildActions;
    const GuildInfo = DiscordModules.GuildInfo;
    const Animations = WebpackModules.getByProps("spring");

    return class ServerSearch extends Plugin {
        constructor() {
            super();
            this.cancels = [];
    
            this.css = `#server-search {
	margin-bottom: 10px;
}

.popout-3sVMXz.popout-server-search,
.popout-3sVMXz.popout-server-search-small {
	margin-top: 0;
	z-index: 1005;
}

.popout-3sVMXz.popout-server-search-small {
	padding: 10px;
	background:#2f3136;
	box-shadow: 0 0px 15px rgba(0,0,0,0.6);
	border-radius: 4px;
}

.no-image {
	background: rgb(47, 49, 54);
	font-size: 12px;
	justify-content: center;
	align-items: center;
	display: flex;
}`;
            this.guildHtml = `<div class="listItem-2P_4kh" id="server-search">
        <div class="pill-3YxEhL wrapper-sa6paO">
            <span class="item-2hkk8m" style="opacity: 0; height: 8px; transform: translate3d(-4px, 0px, 0px);"></span>
        </div>
        <div tabindex="0" class="circleButtonMask-2VNJsN wrapper-25eVIn" role="button" style="border-radius: 25px; background-color: rgb(47, 49, 54);">
            <svg width="48" height="48" viewBox="0 0 48 48" class="svg-1X37T1 da-svg">
                <foreignObject mask="url(#782e4422-824c-4b8f-bbe5-18c62c59a77f)" x="0" y="0" width="48" height="48">
                    <div tabindex="0" class="circleIconButton-jET_ig" role="button" style="background: none;">
                        <svg name="Search" width="24" height="24" viewBox="0 0 18 18">
                            <g fill="none" fill-rule="evenodd">
                                <path fill="white" d="M3.60091481,7.20297313 C3.60091481,5.20983419 5.20983419,3.60091481 7.20297313,3.60091481 C9.19611206,3.60091481 10.8050314,5.20983419 10.8050314,7.20297313 C10.8050314,9.19611206 9.19611206,10.8050314 7.20297313,10.8050314 C5.20983419,10.8050314 3.60091481,9.19611206 3.60091481,7.20297313 Z M12.0057176,10.8050314 L11.3733562,10.8050314 L11.1492281,10.5889079 C11.9336764,9.67638651 12.4059463,8.49170955 12.4059463,7.20297313 C12.4059463,4.32933105 10.0766152,2 7.20297313,2 C4.32933105,2 2,4.32933105 2,7.20297313 C2,10.0766152 4.32933105,12.4059463 7.20297313,12.4059463 C8.49170955,12.4059463 9.67638651,11.9336764 10.5889079,11.1492281 L10.8050314,11.3733562 L10.8050314,12.0057176 L14.8073185,16 L16,14.8073185 L12.2102538,11.0099776 L12.0057176,10.8050314 Z"></path>
                            </g>
                        </svg>
                    </div>
                </foreignObject>
            </svg>
        </div>
    </div>`;
            this.separatorHtml = `<div class="listItem-2P_4kh"><div class="guildSeparator-3s64Iy server-search-separator"></div></div>`;
            this.smallPopoutHtml = `<div class="popout-3sVMXz noArrow-3BYQ0Z popoutRight-2ZVwL- popout-server-search-small">
    <div
        class="searchBar-2pWH0_ container-2XeR5Z medium-2-DE5M">
        <div class="inner-3ErfOT">
            <input class="input-1Rv96N" type="text" spellcheck="false" placeholder="Search..." value="">
            <div tabindex="0" class="iconLayout-1WxHy4 medium-2-DE5M" role="button">
                <div class="iconContainer-O4O2CN">
                    <svg name="Search" class="icon-3cZ1F_ visible-3V0mGj" width="18" height="18" viewBox="0 0 18 18"> <g fill="none" fill-rule="evenodd"> <path fill="currentColor" d="M3.60091481,7.20297313 C3.60091481,5.20983419 5.20983419,3.60091481 7.20297313,3.60091481 C9.19611206,3.60091481 10.8050314,5.20983419 10.8050314,7.20297313 C10.8050314,9.19611206 9.19611206,10.8050314 7.20297313,10.8050314 C5.20983419,10.8050314 3.60091481,9.19611206 3.60091481,7.20297313 Z M12.0057176,10.8050314 L11.3733562,10.8050314 L11.1492281,10.5889079 C11.9336764,9.67638651 12.4059463,8.49170955 12.4059463,7.20297313 C12.4059463,4.32933105 10.0766152,2 7.20297313,2 C4.32933105,2 2,4.32933105 2,7.20297313 C2,10.0766152 4.32933105,12.4059463 7.20297313,12.4059463 C8.49170955,12.4059463 9.67638651,11.9336764 10.5889079,11.1492281 L10.8050314,11.3733562 L10.8050314,12.0057176 L14.8073185,16 L16,14.8073185 L12.2102538,11.0099776 L12.0057176,10.8050314 Z"></path></g></svg>
                </div>
            </div>
        </div>
    </div>
</div>`;
            this.largePopoutHtml = `<div class="popout-3sVMXz noArrow-3BYQ0Z popoutRight-2ZVwL- popout-server-search" style="margin-top: 0;">
    <div class="popoutList-T9CKZQ guildSettingsAuditLogsUserFilterPopout-3Jg5NE elevationBorderHigh-2WYJ09 role-members-popout">
        <div class="popoutListInput-1l9TUI size14-3iUx6q container-cMG81i small-2oHLgT">
            <div class="inner-2P4tQO"><input class="input-3Xdcic" placeholder="Search Servers - {{count}}" value="">
                <div tabindex="0" class="iconLayout-3OgqU3 small-2oHLgT" role="button">
                    <div class="iconContainer-2wXvy1">
                        <svg name="Search" class="icon-1S6UIr visible-3bFCH-" width="18" height="18" viewBox="0 0 18 18"><g fill="none" fill-rule="evenodd"><path fill="currentColor" d="M3.60091481,7.20297313 C3.60091481,5.20983419 5.20983419,3.60091481 7.20297313,3.60091481 C9.19611206,3.60091481 10.8050314,5.20983419 10.8050314,7.20297313 C10.8050314,9.19611206 9.19611206,10.8050314 7.20297313,10.8050314 C5.20983419,10.8050314 3.60091481,9.19611206 3.60091481,7.20297313 Z M12.0057176,10.8050314 L11.3733562,10.8050314 L11.1492281,10.5889079 C11.9336764,9.67638651 12.4059463,8.49170955 12.4059463,7.20297313 C12.4059463,4.32933105 10.0766152,2 7.20297313,2 C4.32933105,2 2,4.32933105 2,7.20297313 C2,10.0766152 4.32933105,12.4059463 7.20297313,12.4059463 C8.49170955,12.4059463 9.67638651,11.9336764 10.5889079,11.1492281 L10.8050314,11.3733562 L10.8050314,12.0057176 L14.8073185,16 L16,14.8073185 L12.2102538,11.0099776 L12.0057176,10.8050314 Z"></path></g></svg>
                    </div>
                </div>
            </div>
        </div>
        <div class="divider-3573oO divider-faSUbd marginTop8-1DLZ1n marginBottom8-AtZOdT"></div>
        <div class="scrollerWrap-2lJEkd firefoxFixScrollFlex-cnI2ix scrollerThemed-2oenus themeGhostHairline-DBD-2d scrollerTrack-1ZIpsv">
            <div class="scroller-2FKFPG firefoxFixScrollFlex-cnI2ix systemPad-3UxEGl scroller-2CvAgC search-results">
                
            </div>
        </div>
    </div>
</div>`;
            this.popoutItemHtml = `<div class="flex-1xMQg5 flex-1O1GKY horizontal-1ae9ci horizontal-2EEEnY flex-1O1GKY directionRow-3v3tfG justifyStart-2NDFzi alignCenter-1dQNNs noWrap-3jynv6 selectableItem-1MP3MQ search-result" style="flex: 1 1 auto; height: auto;">
    <div class="flex-1xMQg5 flex-1O1GKY horizontal-1ae9ci horizontal-2EEEnY flex-1O1GKY directionRow-3v3tfG justifyStart-2NDFzi alignCenter-1dQNNs noWrap-3jynv6 selectableItemLabel-1RKQjD" style="flex: 1 1 auto;">
        <div class="wrapper-2F3Zv8 small-5Os1Bb flexChild-faoVW3" style="flex: 0 1 auto;">
            <div class="image-33JSyf small-5Os1Bb" style="background-image: url(&quot;{{image_url}}&quot;);">
            </div>
        </div>
        <div class="userText-1WdPps" style="flex: 1 1 auto;">
            <span class="username">{{name}}</span>
        </div>
    </div>
</div>`;
        }

        onStart() {
            PluginUtilities.addStyle(this.getName(), this.css);
            this.addSearchButton();
        }
        
        onStop() {
            $(".server-search-separator").remove();
            $("#server-search").remove();
            for (const c of this.cancels) c();
            PluginUtilities.removeStyle(this.getName());
        }

        getSettingsPanel() {
            return this.buildSettingsPanel().getElement();
        }

        addSearchButton() {
            const guildElement = $(this.guildHtml);
            const guildElementInner = guildElement.find(".wrapper-25eVIn");
            $(".listItem-2P_4kh .guildSeparator-3s64Iy").parent().before($(this.separatorHtml), guildElement);
    
            
            const gray = "#2F3136";
            const purple = "#7289da";
            const purpleRGB = ColorConverter.getRGB(purple);
            const grayRGB = ColorConverter.getRGB(gray);
            const backgroundColor = new Animations.Value(0);
            backgroundColor.interpolate({
                inputRange: [0, 1],
                outputRange: [purple, gray]
            });
    
            backgroundColor.addListener((value) => {
                const getVal = (i) => {
                    return Math.round((purpleRGB[i] - grayRGB[i]) * value.value + grayRGB[i]);
                };
                guildElementInner.css("background-color", `rgb(${getVal(0)}, ${getVal(1)}, ${getVal(2)})`);
            });
    
            const borderRadius = new Animations.Value(0);
            borderRadius.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 25]
            });
    
            borderRadius.addListener((value) => {
                // (end - start) * value + start
                guildElementInner.css("border-radius", (15 - 25) * value.value + 25);
            });
    
            const animate = (v) => {
                Animations.parallel([
                    Animations.timing(backgroundColor, {toValue: v, duration: 200}),
                    Animations.spring(borderRadius, {toValue: v, friction: 3})
                ]).start();
            };
    
            guildElement.on("mouseenter", () => {animate(1);});
    
            guildElement.on("mouseleave", () => {
                if (!guildElement.hasClass("selected")) animate(0);
            });
    
            // new Tooltip(guildElement, "Server Search", {side: "right"});
    
            guildElement.on("click", (e) => {
                if (guildElement.hasClass("selected")) return;
                e.stopPropagation();
                guildElement.addClass("selected");
    
                if (this.settings.inPlace) {
                    return this.showSmallPopout(guildElement[0], {onClose: () => {
                        guildElement.removeClass("selected");
                        this.updateSearch("");
                        animate(0);
                    }});
                }
    
                this.showLargePopout(guildElement[0], {onClose: () => {
                    guildElement.removeClass("selected");
                    animate(0);
                }});
            });
        }
    
        showPopout(popout, target, id, options = {}) {
            const {onClose} = options;
            popout.appendTo(document.querySelector(DiscordSelectors.Popouts.popouts));
            const maxWidth = Screen.width;
            const maxHeight = Screen.height;
    
            const offset = target.getBoundingClientRect();
            if (offset.right + popout.outerHeight() >= maxWidth) {
                popout.addClass("popout-left");
                popout.css("left", Math.round(offset.left - popout.outerWidth() - 20));
                popout.animate({left: Math.round(offset.left - popout.outerWidth() - 10)}, 100);
            }
            else {
                popout.addClass("popout-right");
                popout.css("left", offset.right + 10);
                popout.animate({left: offset.right}, 100);
            }
    
            if (offset.top + popout.outerHeight() >= maxHeight) popout.css("top", Math.round(maxHeight - popout.outerHeight()));
            else popout.css("top", offset.top);
    
            const listener = document.addEventListener("click", (e) => {
                const target = $(e.target);
                if (!target.hasClass(id) && !target.parents(`.${id}`).length) {
                    popout.remove();
                    document.removeEventListener("click", listener);
                    if (onClose) onClose();
                }
            });
        }
    
        showSmallPopout(target, options = {}) {
            const {onClose} = options;
            const popout = $(this.smallPopoutHtml);
            const searchInput = popout.find("input");
            searchInput.on("keyup", () => {
                this.updateSearch(searchInput.val());
            });
    
            this.showPopout(popout, target, "popout-server-search-small", {onClose: onClose});
            searchInput.focus();
        }
    
        showLargePopout(target, options = {}) {
            const {onClose} = options;
    
            const guilds = SortedGuildStore.getSortedGuilds().slice(0);
            for (let i = 0; i < guilds.length; i++) guilds[i] = guilds[i].guild;
    
            const popout = $(Utilities.formatString(this.largePopoutHtml, {count: guilds.length}));
    
            const searchInput = popout.find("input");
            searchInput.on("keyup", () => {
                const items = popout[0].querySelectorAll(".search-result");
                for (let i = 0, len = items.length; i < len; i++) {
                    const search = searchInput.val().toLowerCase();
                    const item = items[i];
                    const username = item.querySelector(".username").textContent.toLowerCase();
                    if (!username.includes(search)) item.style.display = "none";
                    else item.style.display = "";
                }
            });
    
            const scroller = popout.find(".search-results");
            for (const guild of guilds) {
                const image = ImageResolver.getGuildIconURL(guild);
                const elem = $(Utilities.formatString(this.popoutItemHtml, {name: guild.name, image_url: image}));
                if (!image) {
                    const imageElement = elem.find(".image-33JSyf");
                    imageElement.text(GuildInfo.getAcronym(guild.name));
                    imageElement.addClass("no-image");
                }
                elem.on("click", () => {
                    GuildActions.selectGuild(guild.id);
                });
                scroller.append(elem);
            }
    
            this.showPopout(popout, target, "popout-server-search", {onClose: onClose});
            searchInput.focus();
        }
    
        updateSearch(query) {
            if (!query) return this.resetGuilds();
            $(".listItem-2P_4kh:has(.blobContainer-239gwq)").each((_, guild) => {
                const name = ReactTools.getReactProperty(guild, "return.memoizedProps.guild.name");
                if (name.toLowerCase().includes(query.toLowerCase())) guild.style.display = "";
                else guild.style.display = "none";
            });
        }
    
        resetGuilds() {
            $(".listItem-2P_4kh:has(.blobContainer-239gwq)").each((_, guild) => {
                guild.style.display = "";
            });
        }

    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/