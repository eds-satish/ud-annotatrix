'use strict'

/**
 * This file contains support for graphical editing.
 */

const KEYS = {
		DELETE: 46,
		BACKSPACE: 8,
		ENTER: 13,
		ESC: 27,
		TAB: 9,
		RIGHT: 39,
		LEFT: 37,
		UP: 38,
		DOWN: 40,
		MINUS: 173, // not 189 ...
		EQUALS: 61, // not 187 ...
		SHIFT: 16,
		OPT: 17,
		CTRL: 18,
		PAGE_UP: 33,
		PAGE_DOWN: 34,
		META: 224,
		D: 68,
		I: 73,
		J: 74,
		K: 75,
		M: 77,
		P: 80,
		R: 82,
		S: 83,
		Y: 89,
		Z: 90,
		SIDES: {
				39: 'right',
				37: 'left'
		}
}
var CURRENT_ZOOM = 1.0;
var IS_EDITING = false;

var pressed = {}; // used for onKeyupInDocument

function updateGui() {
    log.debug(`called updateGui()`);

    /* The function handles the format tabs above the textarea.
    Takes a string with a format name, changes the classes on tabs. */
    const format = _.format();

		$('.nav-link').removeClass('active').show();
		switch (format) {
				case ('Unknown'):
						$('.nav-link').hide();
						$('#tabOther').addClass('active').show().text(format);
						break;
				case ('CoNLL-U'):
						$('#tabConllu').addClass('active');
						$('#tabOther').hide();
						break;
				case ('CG3'):
						$('#tabCG3').addClass('active');
						$('#tabOther').hide();
						break;
				case ('plain text'):
						$('#tabText').hide(); // NOTE: no break here
				default:
						$('#tabOther').addClass('active').show().text(format);
						break;
		}

		if (format !== 'CoNLL-U')
				_.is_table_view(false);

		if (_.is_table_view()) {
				$('#btnToggleTable i').removeClass('fa-code');
				$('#text-data').hide();
				$('#table-data').show();
				buildTable();
		} else {
				$('#btnToggleTable i').addClass('fa-code');
				$('#text-data').show();
				$('#table-data').hide();
		}

		if (_.is_textarea_visible) {
				$('#data-container').show();
				$('#top-buttons-container').removeClass('extra-space');
				$('#btnToggleTable').show();
		} else {
				$('#data-container').hide();
				$('#top-buttons-container').addClass('extra-space');
				$('.nav-link').not('.active').hide();
				$('#btnToggleTable').hide();
		}

		updateGraph();
}

// basic event handlers
function bindHandlers() {
		log.debug(`called bindHandlers()`);
    /* Binds handlers to DOM elements. */

    $('#btnPrevSentence').click(prevSentence);
		$('#current-sentence').blur(goToSentence);
    $('#btnNextSentence').click(nextSentence);
    $('#btnRemoveSentence').click(removeSentence);
    $('#btnAddSentence').click(insertSentence);

		$('#btnUploadCorpus').click(uploadCorpus);
    $('#btnExportCorpus').click(exportCorpus);
    //$('#btnSaveServer').click(saveOnServer);
    $('#btnDiscardCorpus').click(clearCorpus);
		$('#btnPrintCorpus').click(printCorpus);

		$('#btnHelp').click(showHelp);
		$('#btnSettings').click(showSettings);

		$('#tabText').click((event) => { convertText(convert2PlainText); });
		$('#tabConllu').click((event) => { convertText(convert2Conllu); });
		$('#tabCG3').click((event) => { convertText(convert2CG3); });

		$('#btnToggleTable').click(toggleTable);
		$('#btnToggleTextarea').click(toggleTextarea);

		$('#text-data').keyup(onEditTextData);
		$('.thead-default th').click(toggleTableColumn);

    $('#RTL').click(toggleRTL);
    $('#vertical').click(toggleVertical);
    $('#enhanced').click(toggleEnhanced);

		$('#current-sentence').keyup(onKeyupInTextarea);

		// onkeydown, onkeyup are global variables for JS runtime
		onkeydown = onkeyup = onKeyupInDocument;

		/* what's up with this stuff ?? (updated 5/27/18)

		$('#btnExportPNG').click(exportPNG);
    $('#btnExportSVG').click(exportSVG);
    $('#btnExportLaTeX').click(exportLaTeX);

    $('#filename').change(loadFromFile);

		$('#helpModal').on('shown.bs.modal', (e) => {
        // $('#treebankSize').text(CONTENTS.length); // TODO: Report the current loaded treebank size to user
				$(e.target).find('.modal-body').load('help.html');
		});

    $('#exportModal').on('shown.bs.modal', (e) => {
				// $('#treebankSize').text(CONTENTS.length); // TODO: Report the current loaded treebank size to user
				$(e.target).find('.modal-body').load('export.html', exportPNG);
		});

    $('#exportModal').on('hidden.bs.modal', (e) => {
        IS_PNG_EXPORTED = false;
        IS_LATEX_EXPORTED = false;
    });*/

		//$(document).keydown(keyDownClassifier);
}
function onKeyupInTextarea(event) {
		log.debug(`called onKeyupInTextarea(${event.which})`);

		switch (event.which) {
				case (KEYS.ENTER):
						goToSentence();
						break;
				case (KEYS.LEFT):
				case (KEYS.J):
						prevSentence();
						break;
				case (KEYS.RIGHT):
				case (KEYS.K):
						nextSentence();
						break;
				case (KEYS.MINUS):
						removeSentence();
						break;
				case (KEYS.EQUALS):
						insertSentence();
						break;
		}
}
function onKeyupInDocument(event) {
		log.debug(`called onKeyupInDocument(which:${event.which}, pressed:${JSON.stringify(pressed)})`);

		// handle Ctrl + <keypress>
		// solution based on https://stackoverflow.com/a/12444641/5181692

		pressed[event.which] = (event.type === 'keydown');
		if (!pressed[KEYS.CTRL])
				return;

		if (pressed[KEYS.PAGE_DOWN]) {
				if (pressed[KEYS.SHIFT]) {
						$('#current-sentence').val(_.sentences.length);
						goToSentence();
				} else {
						nextSentence();
				}
				pressed = {};
				pressed[KEYS.CTRL] = true;

		} else if (pressed[KEYS.PAGE_UP]) {
				if (pressed[KEYS.SHIFT]) {
						$('#current-sentence').val(1);
						goToSentence();
				} else {
						prevSentence();
				}
				pressed = {};
				pressed[KEYS.CTRL] = true;

		} else if (pressed[KEYS.Z]) {
			undoManager.undo();
		} else if (pressed[KEYS.Y] || (pressed[KEYS.Z]  && pressed[KEYS.SHIFT])) {
			undoManager.redo();
		}
}
function onEditTextData(event) {
		log.debug(`called onEditTextData(key: ${event.which})`);

		saveGraphEdits();

		switch (event.which) {
				case (KEYS.ESC):
						this.blur();
						break;
				case (KEYS.ENTER):
						onEnter(event);
						break;
				default:
						parseText();
		}
}
function onEnter(event) {
		log.debug(`called onEnter()`);

		let format = _.format(),
				sentence = _.sentence(),
				cursor = $('#text-data').prop('selectionStart') - 1,
				lines = sentence.split('\n'),
				lineId = null, before, during, after,
				cursorLine = 0;

		if (_.is_table_view()) {

				cursorLine = parseInt($(event.target).closest('td').attr('row-id'));

		} else {

				if (format === 'Unknown' || format === 'plain text')
						return;

				// get current line number
				let acc = 0;
				$.each(lines, (i, line) => {
						acc += line.length;
						if (acc + i < cursor)
								cursorLine = i + 1;
				});
				log.debug(`onEnter(): cursor on line[${cursorLine}]: "${lines[cursorLine]}"`);

				// advance the cursor until we are at the end of a line that isn't followed by a comment
				//   or at the very beginning of the textarea
				if (cursor !== 0 || sentence[0] === '#') {
						log.debug(`onEnter(): cursor[${cursor}]: "${sentence[cursor]}" (not at textarea start OR textarea has comments)`)
						while (sentence[cursor + 1] === '#' || sentence[cursor] !== '\n') {
								log.debug(`onEnter(): cursor[${cursor}]: "${sentence[cursor]}", line[${cursorLine}]: ${lines[cursorLine]}`);
								if (cursor === sentence.length)
										break;
								if (sentence[cursor] === '\n')
										cursorLine++;
								cursor++;
						}
				} else {
						log.debug(`onEnter(): cursor[${cursor}]: "${sentence[cursor]}" (at textarea start)`)
						cursorLine = -1;
				}
		}

		log.debug(`onEnter(): cursor[${cursor}]: "${sentence[cursor]}", line[${cursorLine}]: ${lines[cursorLine]}`);

		switch (format) {
				case ('CoNLL-U'):

						if (event.preventDefault) // bc of testing, sometimes these are fake events
								event.preventDefault();

						lineId = lines[cursorLine] ? lines[cursorLine].match(/^[0-9]+/) : 0;
						lineId = lineId ? parseInt(lineId) + 1 : 1;
						log.debug(`onEnter(): inserting line with id: ${lineId}`);
						log.debug(`onEnter(): resetting ids of lines: [${lines.slice(cursorLine + 1).join(',')}]`);

						before = lines.slice(0, cursorLine + 1);
						during = [`${lineId}\t_\t_\t_\t_\t_\t_\t_\t_\t_`];
						after = lines.slice(cursorLine + 1).map((line) => {
							 	// NOTE: on regex:
								// e.g. "6	form	lemma" => ['6', '6']
								// e.g. "6-7 form	lemma" => ['6-7', '6', '7']
								const matches = line.match(/^([0-9]+)(?:-([0-9]+))?/);
								log.debug(`onEnter(): matches: [${matches.join(',')}]`);
								line = line.replace(matches[1], parseInt(matches[1]) + 1);
								if (matches[2] !== undefined)
										line = line.replace(`-${matches[2]}`, `-${parseInt(matches[2]) + 1}`);
								return line;
						});

						log.debug(`onEnter(): preceding line(s) : [${before}]`);
						log.debug(`onEnter(): interceding line  : [${during}]`);
						log.debug(`onEnter(): proceeding line(s): [${after}]`);

						$('#text-data').val(before.concat(during, after).join('\n'))
								.prop('selectionStart', cursor)
								.prop('selectionEnd', cursor);

						break;

				case ('CG3'):

						if (event.preventDefault) // bc of testing, sometimes these are fake events
								event.preventDefault();

						// advance to the end of an analysis
						log.debug(`onEnter(): line[${cursorLine}]: "${lines[cursorLine]}", cursor[${cursor}]: "${sentence[cursor]}"`);
						while (cursorLine < lines.length - 1) {
								if (lines[cursorLine + 1].startsWith('"<'))
										break;
								cursorLine++;
								cursor += lines[cursorLine].length + 1;
								log.debug(`onEnter(): incrementing line[${cursorLine}]: "${lines[cursorLine]}", cursor[${cursor}]: "${sentence[cursor]}"`);
						}

						lineId = lines.slice(0, cursorLine + 1).reduce((acc, line) => {
								return acc + line.startsWith('"<');
						}, 0) + 1;
						log.debug(`onEnter(): inserting line with id: ${lineId}`);
						log.debug(`onEnter(): resetting all content lines: [${lines}]`);

						const incrementIndices = (lines, lineId) => {
								return lines.map((line) => {
										if (line.startsWith('#'))
												return line;
										(line.match(/[#>][0-9]+/g) || []).map((match) => {
												let id = parseInt(match.slice(1));
												id += (id >= lineId ? 1 : 0);
												line = line.replace(match, `${match.slice(0,1)}${id}`)
										});
										return line;
								});
						}
						before = incrementIndices(lines.slice(0, cursorLine + 1), lineId);
						during = [`"<_>"`, `\t${getCG3Analysis(lineId, {id:lineId})}`];
						after = incrementIndices(lines.slice(cursorLine + 1), lineId);

						log.debug(`onEnter(): preceding line(s) : [${before}]`);
						log.debug(`onEnter(): interceding lines : [${during}]`);
						log.debug(`onEnter(): proceeding line(s): [${after}]`);

						$('#text-data').val(before.concat(during, after).join('\n'))
								.prop('selectionStart', cursor)
								.prop('selectionEnd', cursor);

						break;

				default:
						if (event.preventDefault)
								event.preventDefault();
						insertSentence();
		}

		parseText();
}

// show external things
function showHelp() {
    log.debug(`called showHelp()`);
    // Opens help in new tab
    window.open('help.html', '_blank').focus();
}
function showSettings(event) {
		log.debug(`called showSettings()`);
		throw new NotImplementedError('showSettings() not implemented');
}

// togglers
function toggleTextarea() {
		log.debug(`called toggleTextarea()`);

		_.is_textarea_visible = !_.is_textarea_visible;
		$('#btnToggleTextarea i')
				.toggleClass('fa-chevron-up')
				.toggleClass('fa-chevron-down')

		updateGui();
}
function toggleRTL() {
		log.debug(`called toggleRTL()`);

		$('#RTL .fa')
				.toggleClass('fa-align-right')
				.toggleClass('fa-align-left');
		_.is_ltr = !_.is_ltr;

		updateGui();
}
function toggleVertical() {
		log.debug(`called toggleVertical()`);

		$('#vertical .fa').toggleClass('fa-rotate-90');
		_.is_vertical = !_.is_vertical;

		updateGui();
}
function toggleEnhanced() {
		log.debug(`called toggleEnhanced()`);

	  $('#enhanced .fa')
				.toggleClass('fa-tree')
				.toggleClass('fa-magic');
		_.is_enhanced = !_.is_enhanced;

		updateGui();
}

// cy-related GUI stuff
function bindCyHandlers() {
		log.debug('called bindCyHandlers()');

    /**
		 * Binds event handlers to cy elements.
		 * NOTE: If you change the style of a node (e.g. its selector) then
     * you also need to update it here.
		 */

		 // set a countdown to triggering a "background" click unless a node/edge intercepts it
		 $('#cy canvas').mouseup((event) => {
	 			setTimeout(() => {
						clickInCanvas(event);
						_.intercepted = false;
				}, 100);
 		});
		$('#cy canvas').mousemove((event) => {
				_.intercepted = true;
		});

		// for debugging and intercepting background clicks
		cy.on('click', '*', (event) => {
				_.intercepted = true;
				console.info(`clicked ${event.target.attr('id')}, data:`, event.target.data());
		});

		cy.on('click', 'node.form', clickFormNode);       // drawArcs
    cy.on('click', 'node.pos', clickPosNode);         // changeNode
    cy.on('click', '$node > node', clickChildNode);   // selectSup
		cy.on('cxttapend', 'node.form', cxttapendFormNode); // changeNode

    cy.on('click', 'edge.dependency', clickDependencyEdge);  // changeNode
		cy.on('cxttapend', 'edge.dependency', cxttapendDependencyEdge); // selectArc

}

function clickFormNode(event) {
		const target = event.target;
		log.debug(`called clickFormNode(${target.attr('id')})`);

		saveGraphEdits();
		_.editing = null;

		cy.$('.selected').removeClass('selected');
		cy.$('.arc-selected').removeClass('arc-selected');

		if (target.hasClass('activated')) {
				target.removeClass('activated');

		} else {

				const source = cy.$('.activated');
				target.addClass('activated');

				// if there was already an activated node
				if (source.length === 1) {
						makeDependency(source, target);
						source.removeClass('activated');
						target.removeClass('activated');
				}

		}
}
function clickPosNode(event) {
		const target = event.target;
		log.warn(`called clickPosNode(${target.attr('id')})`);

		saveGraphEdits();
		_.editing = target;

		cy.$('.activated').removeClass('activated');
		cy.$('.arc-selected').removeClass('arc-selected');
		cy.$('.selected').removeClass('selected');

		editGraphLabel(target);
}
function clickChildNode(event) {
		// NB: event.target is the PARENT of a child we click
		const target = event.target;
		log.warn(`called clickChildNode(${target.attr('id')})`);
		target.toggleClass('supAct');
}
function cxttapendFormNode(event) {
		const target = event.target;
		log.warn(`called cxttapendFormNode(${target.attr('id')})`);
}

function clickDependencyEdge(event) {
		const target = event.target;
		log.warn(`called clickDependencyEdge(${target.attr('id')})`);

		/**
		 * Activated when an arc is selected. Adds classes showing what is selected.
		 */

		saveGraphEdits();
		_.editing = target;

		cy.$('.activated').removeClass('activated');

		if (target.hasClass('selected')) {

				cy.$(`#${target.data('target')}`).removeClass('arc-selected');  // visual effects on targeted node
				target.removeClass('selected');

		} else {

				cy.$('.arc-selected').removeClass('arc-selected');
				cy.$(`#${target.data('target')}`).addClass('arc-selected');
				cy.$('.selected').removeClass('selected');
				target.addClass('selected');

		}
}
function cxttapendDependencyEdge(event) {
		const target = event.target;
		log.warn(`called cxttapendDependencyEdge(${target.attr('id')})`);
}


function editGraphLabel(target) {
		log.debug(`called editGraphLabel(${target.attr('id')})`);

		target.addClass('input');

		// get rid of direction arrows
		target.data('label', target.data('label').replace(/[⊳⊲]/, ''));

		// get bounding box
		let bbox = target.renderedBoundingBox();
		bbox.color = target.style('background-color');
		if (target.data('name') === 'dependency') {
				bbox.w = 100;
				bbox.h = cy.nodes()[0].renderedHeight();
				bbox.color = 'white';

				if (_.is_vertical) {
						bbox.y1 += (bbox.y2 - bbox.y1)/2 - 15;
						bbox.x1  = bbox.x2 - 70;
				} else {
						bbox.x1 += (bbox.x2 - bbox.x1)/2 - 50;
				}
		}

		// TODO: rank the labels + make the style better
		const autocompletes = target.data('name') === 'pos-node'
				? U_POS
				: target.data('name') === 'dependency'
				? U_DEPRELS
				: [];

		$('#edit').selfcomplete({
				lookup: autocompletes,
				tabDisabled: false,
				autoSelectFirst: true,
				lookupLimit: 5 })
				.css('top', bbox.y1)
				.css('left', bbox.x1)
				.css('height', bbox.h)
				.css('width', bbox.w + 5)
				.attr('value', target.data('label'))
				.addClass('activated')
				.addClass(target.data('name'))
				.focus();

		if (target.data('name') === 'dependency')
				$('#edit').select();

		/* TODO: what is this ?? (5/31/18)
		$('#mute').addClass('activated')
				.css('height', _.is_vertical
						? `${_.tokens().length * 50}px`
						: $(window).width() - 10); */

		console.log(bbox);
		return;

		const id = this.attr('id').slice(0, 2);
		if (id === 'ed') {
				nodeType = 'DEPREL';
		} else if (id === 'np') {
				nodeType = 'UPOS';
		}
    $('#edit')
				.css('top', param.y1)
        .css('left', param.x1)
        .css('height', param.h)
        .css('width', param.w + 35)
        //.css('background-color', param.color)
        .attr('value', this.data('label'))
        .addClass('activated')
        .addClass(id);

    if (nodeType === 'DEPREL') {
        $('#edit').focus().select();
    } else {
        $('#edit').focus();
    }

}

function saveGraphEdits() {
		log.debug(`called saveGraphEdits()`);

		cy.$('.input').removeClass('input');

		if (_.editing === null)
				return; // nothing to do

}
function clickInCanvas(event) {
		log.error(`called clickInCanvas(intercepted: ${_.intercepted})`);

		// intercepted by clicking a canvas subobject && mousemove (i.e. drag)
		if (_.intercepted)
				return;

		saveGraphEdits();
		_.editing = null;

		cy.$('.activated').removeClass('activated');
		cy.$('.arc-selected').removeClass('arc-selected');
		cy.$('.selected').removeClass('selected');
}





function makeDependency(source, target) {
		log.debug(`called makeDependency(${source.attr('id')}=>${target.attr('id')})`);
		/**
		 * Called by clicking a form-node while there is already an active form-node.
		 * Changes the text data and redraws the graph. Currently supports only conllu.
		 */

		source = source.data('conllu');
		target = target.data('conllu');

		if (source.superTokenId === target.superTokenId) {
				log.warn(`makeDependency(): unable to create dependency within superToken ${source.superTokenId}`);
				return;
		}

		const oldHead = modifyConllu(source.superTokenId, source.subTokenId, 'head', target.id);

		window.undoManager.add({
				undo: () => {
						modifyConllu(source.superTokenId, source.subTokenId, 'head', oldHead);
				},
				redo: () => {
						modifyConllu(source.superTokenId, source.subTokenId, 'head', target.id);
				}
		})

		return;
		/*


		// TODO:
		// If the target POS tag is PUNCT set the deprel to @punct [99%]
		// IF the target POS tag is CCONJ set the deprel to @cc [88%]
		// IF the target POS tag is SCONJ set the deprel to @mark [86%]
		// IF the target POS tag is DET set the deprel to @det [83%]

		// NOTE: can just define a new attr `index` or something on the DOM
		const sourceIndex = parseInt(source.attr('id').slice(2));
		const targetIndex = parseInt(target.attr('id').slice(2));

		const indices = findConlluId(target);

		let sent = buildSent(),
				thisToken = sent.tokens[indices.outer],
				sentAndPrev = changeConlluAttr(sent, indices, 'head', sourceIndex);

		const POS_TO_REL = {
				'PUNCT': 'punct',
				'DET': 'det',
				'CCONJ': 'cc',
				'SCONJ': 'mark'
		}


		// TODO: Put this somewhere better
		if (thisToken.upostag in POS_TO_REL)
				sentAndPrev = changeConlluAttr(sent, indices, 'deprel', POS_TO_REL[thisToken.upostag]);

		let isValidDep = true;
		if (thisToken.upostag === 'PUNCT' && !is_projective_nodes(sent.tokens, [targetIndex])) {
				log.warn('writeArc(): Non-projective punctuation');
				isValidDep = false
		}

		window.undoManager.add({
				undo: () => {
						let sent = buildSent(),
								sentAndPrev = changeConlluAttr(sent, indices, 'head', sentAndPrev.previous);
						redrawTree(sentAndPrev.sentence);
				},
				redo: () => {
						writeArc(source, target);
				}
		});

		redrawTree(sent);*/
}

function modifyConllu(superTokenId, subTokenId, attrKey, attrValue) {
		log.error(`called modifyConllu(superTokenId:${superTokenId}, subTokenId:${subTokenId}, attr:${attrKey}=>${attrValue})`);

		const conllu = _.conllu();
		log.debug(`modifyConllu(): before:  ${conllu.tokens[superTokenId][attrKey]}`);

		let oldValue;
		if (subTokenId !== null) {
				oldValue = conllu.tokens[superTokenId].tokens[subTokenId][attrKey] || '_';
				conllu.tokens[superTokenId].tokens[subTokenId][attrKey] = attrValue;
		} else {
				oldValue = conllu.tokens[superTokenId][attrKey] || '_';
				conllu.tokens[superTokenId][attrKey] = attrValue;
		}

		log.debug(`modifyConllu(): during: ${conllu.tokens[superTokenId][attrKey]}`);
		const text = conllu.serial;
		$('#text-data').val(text);
		parseText();
		log.debug(`modifyConllu(): after:  ${_.conllu().tokens[superTokenId][attrKey]}`);

		// return oldValue for undo/redo purposes
		return oldValue;
}


function changeConlluAttr(sent, indices, attrName, newVal) {
    log.debug('called changeConlluAttr()');

    //if (attrName === 'deprel') {
    //  newVal = newVal.replace(/[⊲⊳]/g, '');
    //}
    let previous;
    if (indices.isSubtoken) {
        previous = sent.tokens[indices.outer].tokens[indices.inner][attrName];
        sent.tokens[indices.outer].tokens[indices.inner][attrName] = newVal;
    } else {
        previous = sent.tokens[indices.outer][attrName];
        sent.tokens[indices.outer][attrName] = newVal;
    }

		return {
				sentence: sent,
				previous: previous
		};
}










function removeArc(targets) {
    log.debug('called removeArc()');

    /* Removes all the selected edges. */

    let sent = buildSent(),
        prevRelations = {};

    // support for multiple arcs
    $.each(targetNodes, (i, target) => {
        const targetIndex = target.attr('id').slice(2),
            indices = findConlluId(target);

        let sentAndPrev = changeConlluAttr(sent, indices, 'head', undefined);

        sent = sentAndPrev.sentence;
        prevRelations.head = sentAndPrev.previous;
        sentAndPrev = changeConlluAttr(sent, indices, 'deprel', undefined);
        sent = sentAndPrev.sentence;
        prevRelations.deprel = sentAndPrev.previous;

    });

    window.undoManager.add({
        undo: () => {
            let sent = buildSent();
            $.each(targetNodes, (i, target) => {
                const targetIndex = target.attr('id').slice(2),
                    indices = findConlluId(target);

                let sentAndPrev = changeConlluAttr(sent, indices, 'head', prevRelations.head);
                sent = sentAndPrev.sentence;
                sentAndPrev = changeConlluAttr(sent, indices, 'deprel', prevRelations.deprel);
                sent = sentAndPrev.sentence;
            });

            redrawTree(sent);
        },
        redo: () => {
            removeArc(targets);
        }
    });

    redrawTree(sent);
}





















function keyDownClassifier(key) {
    log.debug(`called keyDownClassifier(${key.which})`);
		return;

    // looking if there are selected arcs
    const selArcs = cy.$('edge.dependency.selected'),  // + cy.$('edge.dependency.error');
        targetNodes = cy.$('node[state="arc-dest"]'),
        // looking if there is a POS label to be modified
        posInp = $('.activated.np'),
        // looking if there is a wf label to be modified
        wfInp = $('.activated.nf'),
        // looking if there is a deprel label to be modified
        deprelInp = $('.activated.ed'),
        // looking if some wf node is selected
        wf = cy.$('node.wf.activated'),
        // looking if a supertoken node is selected
        st = cy.$('.supAct'),
        // looking if some node waits to be merged
        toMerge = cy.$('.merge'),
        // looking if some node waits to be merged to supertoken
        toSup = cy.$('.supertoken');

    if (selArcs.length) {
        if (key.which === KEYS.DELETE || key.which === KEYS.BACKSPACE) {
            removeArc(targetNodes);
        } else if (key.which === KEYS.D) {
            moveArc();
        };
    } else if (posInp.length) {
        if (key.which === KEYS.ENTER) {
            writePOS(posInp.val());
        };
    } else if (wfInp.length) {
        if (key.which === KEYS.ENTER) {
            writeWF(wfInp);
        };
    } else if (deprelInp.length) {
        if (key.which === KEYS.ENTER) {
            var res = deprelInp.val();
            // to get rid of the magic direction arrows
            res = res.replace(/[⊳⊲]/, '');
            writeDeprel(res);
        };
    } else if (wf.length === 1) {
        if (key.which === KEYS.M) {
            wf.addClass('merge');
            wf.removeClass('activated');
        } else if (key.which === KEYS.S) {
            wf.addClass('supertoken');
            wf.removeClass('activated');
        } else if (key.which === KEYS.R) {
            setRoot(wf);
        };
    } else if (toMerge.length) {
        if (key.which in KEYS.SIDES) {
            mergeNodes(toMerge, KEYS.SIDES[key.which], 'subtoken');
        }
    } else if (toSup.length) {
        if (key.which in KEYS.SIDES) {
            mergeNodes(toSup, KEYS.SIDES[key.which], 'supertoken');
        }
    } else if (st.length) {
        if (key.which === KEYS.DELETE || key.which === BACKSPACE) {
            removeSup(st);
        }
    }
		if (!$('#text-data').is(':focus')) {
        // console.log('ZOOM: ', CURRENT_ZOOM, inputAreaFocus);
        if ((key.which === KEYS.EQUALS || key.which === 61) ){
            CURRENT_ZOOM = cy.zoom();
            if (key.shiftKey) { // zoom in
                CURRENT_ZOOM += 0.1;
            }  else {  // fit to screen
                CURRENT_ZOOM = cy.fit();
            }
            cy.zoom(CURRENT_ZOOM);
            cy.center();
        } else if ((key.which === KEYS.MINUS || key.which === 173) ) { // zoom out
            CURRENT_ZOOM = cy.zoom();
            //if (key.shiftKey) {
                CURRENT_ZOOM -= 0.1;
            //}
            cy.zoom(CURRENT_ZOOM);
            cy.center();
        } else if (key.which === 48 ) { // 0 = zoom 1.0
            CURRENT_ZOOM = 1.0;
            cy.zoom(CURRENT_ZOOM);
            cy.center();
        } else if (key.which == KEYS.P && !posInp.length && !wfInp.length && !deprelInp.length) {
						setPunct();
				}
		}
}

function setPunct() {
		// courtesy of Daniel Swanson :)

		log.debug(`called setPunct(): PUNCTUATION TIME!`);

    // Commas and so forth should attach to dependent nodes in these relationships
    const commaEaters = ['acl', 'advcl', 'amod', 'appos', 'ccomp', 'obl'];
    // Paired punctuation that has different left and right forms
    const pairedPunctDiff = {'(':')', '[':']', '{':'}',  '“':'”', '„':'“', '«':'»', '‹':'›', '《':'》', '「':'」', '『':'』', '¿':'?',  '¡':'!'};
    // Paired punctuation where left and right are identical
    const pairedPunctSame = ["'", '"'];

    var sent = buildSent();
    var puncts = [];
    var bracketStack = [];
    var matches = [];
    var tok;
    var headList = [];
    var relList = [];
    var pairedPDLeft = Object.keys(pairedPunctDiff);
    var pairedPDRight = [];
    for (var i = 0; i < pairedPDLeft.length; i++) {
        pairedPDRight.push(pairedPunctDiff[pairedPDLeft[i]]);
    }
    var offsets = [];
    var idToIndex = {undefined:undefined, '0':-1};
    var subnodes = 0;
    var connect = function(src, dest, rel) {
        var sentAndPrev = changeConlluAttr(sent, [false, src, src], 'deprel', rel);
        sentAndPrev = changeConlluAttr(sent, [false, src, src], 'head', (parseInt(dest)+1+offsets[dest]).toString());
        headList[src] = dest;
        relList[src] = rel;
        sent = sentAndPrev[0];
    };
    var settok;
    var found;
    for (var i = 0; i < sent.tokens.length; i++) {
        tok = sent.tokens[i];
        offsets.push(subnodes);
        if (tok.hasOwnProperty('tokens')) {
            settok = 0;
            found = false;
            for (var j = 0; j < tok.tokens.length; j++) {
                idToIndex[tok.tokens[j].id] = i;
                if (!found && (tok.tokens[j].head < tok.tokens[0].id || tok.tokens[j].head > tok.tokens[tok.tokens.length-1].id)) {
                    offsets[i] += j;
                    settok = j;
                    found = true;
                }
            }
            subnodes += tok.tokens.length-1;
            tok = tok.tokens[settok];
        }
        headList.push(tok.head);
        idToIndex[tok.id] = i;
        relList.push(tok.deprel);
        if (tok.deprel == 'punct' && tok.upostag == undefined) {
            sentAndPrev = changeConlluAttr(sent, [false, i, i], 'upostag', 'PUNCT');
            sent = sentAndPrev[0];
            tok = sent.tokens[i];
        }
        if (tok.upostag == 'PUNCT') {
            if (pairedPDLeft.includes(tok.form)) {
                bracketStack.push([i, pairedPunctDiff[tok.form]]);
            } else if (pairedPDRight.includes(tok.form)) {
                if (bracketStack.length > 0 && bracketStack[bracketStack.length-1][1] == tok.form) {
                    matches.push([bracketStack.pop()[0], i]);
                } else {
                    puncts.push(i);
                }
            } else if (pairedPunctSame.includes(tok.form)) {
                if (bracketStack.length > 0 && bracketStack[bracketStack.length-1][1] == tok.form) {
                    matches.push([bracketStack.pop()[0], i]);
                } else {
                    bracketStack.push([i, tok.form]);
                }
            } else {
                puncts.push(i);
            }
        }
    }
    for (var i = 0; i < bracketStack.length; i++) {
        puncts.push(bracketStack[i][0]);
    }
    for (var i = 0; i < headList.length; i++) {
        headList[i] = idToIndex[headList[i]];
        if (headList[i] == undefined) {
            headList[i] = i;
            // pretend that unconnected nodes are pointing at themselves
            // rather than at nothing so we don't have pesky type-conversion issues
        }
    }
    var findBounds = function(idx) {
        var l = 0;
        var r = headList.length-1;
        for (var x = 0; x < headList.length-1; x++) {
            if ([undefined, 'x', 'root'].includes(relList[x])) {
                continue;
            } else if (x < idx && headList[x] > idx) {
                l = Math.max(x, l);
                r = Math.min(headList[x], r);
            } else if (x > idx && headList[x] < idx) {
                l = Math.max(headList[x], l);
                r = Math.min(x, r);
            }
        }
        return [l, r];
    };
    var findPossible = function(idx) {
        var ret = [];
        var bounds = findBounds(idx);
        var edge;
        for (var x = bounds[0]; x <= bounds[1]; x++) {
            if (x != idx && relList[x] != 'punct') {
                edge = findBounds(x);
                if (edge[0] <= idx && idx <= edge[1]) {
                    ret.push(x);
                }
            }
        }
        return ret;
    };
    var l;
    var r;
    var lpos;
    var rpos;
    var lpos2;
    var rpos2;
    var possible;
    var done;
    for (var i = 0; i < matches.length; i++) {
        l = matches[i][0];
        r = matches[i][1];
        lpos = findPossible(l);
        rpos = findPossible(r);
        possible = [];
        lpos2 = [];
        rpos2 = [];
        for (var j = 0; j < lpos.length; j++) {
            if (lpos[j] > l && lpos[j] < r) {
                if (rpos.includes(lpos[j])) {
                    possible.push(lpos[j]);
                }
                lpos2.push(lpos[j]);
            }
        }
        for (var j = 0; j < rpos.length; j++) {
            if (rpos[j] > l && rpos[j] < r) {
                rpos2.push(rpos[j]);
            }
        }
        if (possible.length > 0) {
            done = false;
            for (var j = 0; j < possible.length; j++) {
                if (headList[possible[j]] < l || headList[possible[j]] > r) {
                    connect(l, possible[j], 'punct');
                    connect(r, possible[j], 'punct');
                    done = true;
                    break;
                }
            }
            if (!done) {
                connect(l, possible[0], 'punct');
                connect(r, possible[0], 'punct');
            }
        } else {
            connect(l, lpos2[0], 'punct');
            connect(r, rpos2[rpos2.length-1], 'punct');
        }
    }
    for (var i = 0; i < puncts.length; i++) {
        possible = findPossible(puncts[i]);
        if (puncts[i] == headList.length-1 && possible.includes(relList.indexOf('root'))) {
            connect(puncts[i], relList.indexOf('root'), 'punct');
            continue;
        }
        if (relList[possible[possible.length-1]] == 'conj' && headList[possible[possible.length-1]] <= possible[0]) {
            connect(puncts[i], possible[possible.length-1], 'punct');
            continue;
        }
        possible.sort(function(a, b) {
            var ai = Math.abs(a - puncts[i]);
            var bi = Math.abs(b - puncts[i]);
            if (ai < bi || (ai == bi && a < b)) {
                return -1;
            } else if (bi > ai || (ai == bi && a > b)) {
                return 1;
            } else {
                return 0;
            }
        });
        done = false;
        for (var j = 0; j < possible.length; j++) {
            if (commaEaters.includes(relList[possible[j]])) {
                connect(puncts[i], possible[j], 'punct');
                done = true;
                break;
            }
        }
        if (!done) {
            for (var j = 0; j < possible.length; j++) {
                if (![undefined, 'x', 'root'].includes(relList[possible[j]])) {
                    connect(puncts[i], possible[j], 'punct');
                    done = true;
                    break;
                }
            }
        }
        if (!done && possible.length > 0) {
            connect(puncts[i], possible[0], 'punct');
        }
        if (!done) {
						log.debug(`setPunct(): couldn't find anything to attatch punctuation ${puncts[i]} to.`);
        }
    }

    redrawTree(sent);
}



function moveArc() {
		log.debug('called moveArc()');

    /* Activated after the key responsible for 'move dependent' key. */

		$('rect[data-span-id]').each( (i, node) => {
			node.unbind('click', clickWF);
			node.click(getArc);
		});
}


function removeSup(st) {
		log.debug(`called removeSup(${st.attr('id')})`);

    /* Support for removing supertokens.
    The function takes the cy-element of superoken that was selected,
    removes it and inserts its former subtokens. */

		let sent = buildSent(),
				currentId = parseInt(st.attr('id').slice(2)), // the id of the supertoken to be removed
				subTokens = sent.tokens[currentId].tokens;    // getting its children

		sent.tokens.splice(currentId, 1);		// removing the multiword token
		$.each(subTokens, (i, token) => {   // inserting the subtokens
			sent.tokens.splice(currentId + n, 0, token);
		});

    redrawTree(sent);
}


function changeNode() {
		log.debug(`called changeNode() (entries: ${Object.entries(this)}, id: ${this.attr('id')})`);

    IS_EDITING = true;

		this.addClass('input');
		const id = this.attr('id').slice(0, 2);
		let param = this.renderedBoundingBox(), nodeType;
		log.debug(`changeNode() (param: ${JSON.stringify(param)})`);

		param.color = this.style('background-color');
		if (id === 'ed') {
				param = changeEdgeParam(param);
				nodeType = 'DEPREL';
		} else if (id === 'np') {
				nodeType = 'UPOS';
		}

		// for some reason, there are problems with label in deprels without this
		if (this.data('label') === undefined)
				this.data('label', '');

		// to get rid of the magic direction arrows
		const res = this.data('label').replace(/[⊳⊲]/, '');
    this.data('label', res);

		$('#mute').addClass('activated');
		$('.activated#mute').css('height', (IS_VERTICAL
				? `${buildSent().tokens.length * 50}px`
				:	$(window).width() - 10) );

    // TODO: rank the labels + make the style better
    let availableLabels = [];
    if (nodeType === 'UPOS') {
        availableLabels = U_POS;
    } else if (nodeType === 'DEPREL') {
        availableLabels = U_DEPRELS;
    }
		log.debug(`changeNode() (availableLabels: ${availableLabels})`);


    // autocomplete

		$('#edit').selfcomplete({
				lookup: availableLabels,
				tabDisabled: false,
				autoSelectFirst: true,
				lookupLimit: 5
		});

    $('#edit')
				.css('top', param.y1)
        .css('left', param.x1)
        .css('height', param.h)
        .css('width', param.w + 35)
        //.css('background-color', param.color)
        .attr('value', this.data('label'))
        .addClass('activated')
        .addClass(id);

    if (nodeType === 'DEPREL') {
        $('#edit').focus().select();
    } else {
        $('#edit').focus();
    }

}




function setRoot(wf) {
		log.debug(`called setRoot(id: ${wf.attr('id')})`);

		let sent = buildSent();
		const indices = findConlluId(wf),
				cur = parseInt(sent.tokens[indices.outer].id),
				head = 0;

		log.debug(`setRoot() (outerIndex: ${indices.outer}, cur: ${cur}, head: ${head})`);

		changeConlluAttr(sent, indices, 'deprel', 'root');
		changeConlluAttr(sent, indices, 'head', head);

		redrawTree(sent);
}



function writeDeprel(deprelInp, indices) { // TODO: DRY
		log.debug(`called writeDeprel(${deprelInp}, ${indices})`);

    /* Writes changes to deprel label. */

		if (indices === undefined) {
				const id = cy.$(`.input`).attr('id').slice(2),
						wfNode = cy.$(`#nf${id}`);
				indices = findConlluId(wfNode);
		}

		let sent = buildSent(),
				cur  = parseInt(sent.tokens[indices.outer].id);
				head = parseInt(sent.tokens[indices.outer].head);

		log.debug(`writeDeprel (head: ${head}, cur: ${cur})`);

		const sentAndPrev = changeConlluAttr(sent, indices, 'deprel', deprelInp);

		window.undoManager.add({
				undo: () => {
						const sent = buildSent(),
								sentAndPrev = changeConlluAttr(sent, indices, 'deprel', sentAndPrev.previous);
						redrawTree(sentAndPrev.sentence);
				},
				redo: () => {
						writeDeprel(deprelInp, indices);
				}
		});

    redrawTree(sentAndPrev.sentence);
}


function writePOS(posInp, indices) {
		log.debug(`called writePOS(posInp: ${posInp}, indices: ${JSON.stringify(indices)})`);

    /* Writes changes to POS label. */

    // getting indices
		if (indices === undefined) {
				const id = cy.$(`.input`).attr('id').slice(2),
						wfNode = cy.$(`#nf${id}`);
				indices = findConlluId(wfNode);
		}

		let sent = buildSent(),
				sentAndPrev = changeConlluAttr(sent, indices, 'upostag', posInp);

		window.undoManager.add({
				undo: () => {
						const sent = buildSent(),
								sentAndPrev = changeConlluAttr(sent, indices, 'upostag', sentAndPrev.previous);
						redrawTree(sentAndPrev.sentence);
				},
				redo: () => {
						writePOS(posInp, indices);
				}
		})

    redrawTree(sentAndPrev.sentence);

}



function writeWF(wfInp) {
		log.debug(`called writeWF(${wfInp.val().trim()})`);

    /* Either writes changes to token or retokenises the sentence. */
    const newToken = wfInp.val().trim(),
				indices = findConlluId(cy.$('.input'));

		log.debug(`writeWF() (indices: ${JSON.stringify(indices)})`);

		let sent = buildSent();

    if (newToken.includes(' ')) { // this was a temporal solution. refactor.
        splitTokens(newToken, sent, indices);
    } else {
        if (indices.isSubtoken) {
            // TODO: think, whether it should be lemma or form.
            // sent.tokens[indices.outer].tokens[indices.inner].lemma = newToken;
            sent.tokens[indices.outer].tokens[indices.inner].form = newToken;
        } else {
            sent.tokens[indices.outer].form = newToken;
        }

        redrawTree(sent);
    }
}



function findConlluId(wf) { // TODO: refactor the architecture.
    log.debug(`called findConlluId(id: ${wf.attr('id')})`);

    // takes a cy wf node

    let isSubtoken = false, outerIndex = null, innerIndex = null;
    const parentIndex = cy.$(`#${wf.data('parent')}`).data('parent');

    if (parentIndex !== undefined) {
        isSubtoken = true;
        outerIndex = parseInt(parentIndex.slice(2));
        cy.$(`#${parentIndex}`).children().each((i, child) => {
            if (child.attr('id') === wf.attr('id'))
                innerIndex = i;
        });
    } else {
        const wfIndex = parseInt(wf.attr('id').slice(2));
        $.each(buildSent().tokens, (i, token) => {
            if (token.id === wfIndex)
                outerIndex = i;
        });
    }

		return {
				isSubtoken: isSubtoken,
				outer: outerIndex,
				inner: innerIndex
		};
}



function splitTokens(oldToken, sent, indices) {
		log.debug(`called splitTokens(oldToken: ${oldToken}, sent: ${JSON.stringify(sent)}, indices: ${JSON.stringify(indices)})`);

    /* Takes a token to retokenize with space in it and the Id of the token.
    Creates the new tokens, makes indices and head shifting, redraws the tree.
    All the attributes default to belong to the first part. */

		const newTokens = oldToken.split(' ');
		let token = sent.tokens[indices.outer];

		if (indices.isSubtoken) {

				sent.tokens[indices.outer].tokens[indices.inner].form = newTokens[0];
				// creating and inserting the second part
				const tokenId = sent.tokens[indices.outer].tokens[indices.inner].id;
				const restToken = formNewToken({ 'id':tokenId, 'form':newTokens[1] });
				sent.tokens[indices.outer].tokens.splice(indices.inner + 1, 0, restToken);

		} else {

				sent.tokens[indices.outer].form = newTokens[0];
				// creating and inserting the second part
				const tokenId = sent.tokens[indices.outer].id;
				const restToken = formNewToken({ 'id':tokenId, 'form':newTokens[1] });
				sent.tokens.splice(indices.outer + 1, 0, restToken);

		}


    $.each(sent.tokens, function(i, token) {
        if (token instanceof conllu.MultiwordToken) {
            $.each(token.tokens, function(j, subToken) {
                subToken = shiftIndices(subToken, i, indices, j);
            });
        } else if (token instanceof conllu.Token) {
            token = shiftIndices(token, i, indices);
        }
    });

    redrawTree(sent);
}


function shiftIndices(token, i, indices, j) {
		log.debug(`called shiftIndices(token:${token}, i:${i}, indices:${JSON.stringify(indices)}, j:${j}`);

    if (i > indices.outer || (indices.inner !== undefined && j > indices.inner))
        token.id += 1;

    if (token.head > indices.outer + 1)
        token.head = parseInt(token.head) + 1;

    return token;
}


function renumberNodes(nodeId, otherId, sent, side) {
		log.debug(`called renumberNodes(nodeId: ${nodeId}, otherId: ${otherId}, sent:${JSON.stringify(sent)}, side:${side})`);

    /* Shifts the node and head indices to the right. */
    $.each(sent.tokens, function(i, token) {

				if (    (side === 'right' && token.head > nodeId + 1)
						 || (side === 'left' && token.head > otherId))
						token.head = parseInt(token.head) - 1; // head correction

				if (    (side === 'right' && i > nodeId)
						 || (side === 'left' && i >= otherId))
						token.id -= 1; // id correction

    });

    return sent;
}


function mergeNodes(toMerge, side, how) {
		log.debug(`called mergeNodes(toMergeId: ${toMerge.attr('id')}, side: ${side}, how: ${how})`);

    /* Support for merging tokens into either a new token or a supertoken.
    Recieves the node to merge, side (right or left) and a string denoting
    how to merge the nodes. In case of success, redraws the tree. */

		const indices = findConlluId(toMerge);

		if (indices.isSubtoken) {
				const message = 'Sorry, merging subtokens is not supported!';
				log.warn(message);
				alert(message);
				drawTree();
				return;
		}

		const nodeId = indices.outer,
				otherId  = nodeId + (side === 'right' ? 1 : -1);

		let sent = buildSent();

		if (otherId >= 0 && sent.tokens[otherId]) {

				const main = toMerge.data('form'),
						other = sent.tokens[otherId].form,
						newToken = (side === 'right' ? main + other : other + main);

        if (how === 'subtoken') {

            sent.tokens[nodeId].form = newToken; // rewrite the token
            sent.tokens.splice(otherId, 1); // remove the merged token
            sent = renumberNodes(nodeId, otherId, sent, side);

        } else if (how === 'supertoken') {

            const min = Math.min(nodeId, otherId);
						let supertoken = new conllu.MultiwordToken();

            supertoken.tokens = sent.tokens.splice(min, 2);
            supertoken.form = newToken;
            sent.tokens.splice(min, 0, supertoken);

        };

        redrawTree(sent);

    } else {
				log.warn('mergeNodes() unable to merge: Probably wrong direction?');
    }
}


function buildSent() {
		log.debug(`called buildSent()`);

    /* Reads data from the textbox, returns a sent object. */
    let sent = new conllu.Sentence(),
				currentSent = $('#text-data').val(),
				currentFormat = detectFormat(currentSent);

    if (currentFormat === 'CG3') {
        currentSent = cg32Conllu(currentSent);
        if (currentSent === undefined) {
            drawTree();
            return;
        }
    }

    sent.serial = currentSent;
    return sent;
}


function redrawTree(sent) {
		log.debug(`called redrawTree(${JSON.stringify(sent)})`);

    // Takes a Sentence object. Writes it to the textbox and calls
    // the function drawing the tree and updating the table
    let changedSent = sent.serial;

    // detecting which format was used
		const currentSent = $('#text-data').val(),
				currentFormat = detectFormat(currentSent);

    if (currentFormat === 'CG3')
        changedSent = conllu2CG3(changedSent);

    $('#text-data').val(changedSent);
    //updateTable();
    drawTree();
    cy.zoom(CURRENT_ZOOM);
}




function cantConvertCG() {
		const message = 'Warning: CG containing ambiguous analyses can\'t be converted into CoNLL-U!';
		log.warn(message);

		$('#tabConllu').prop('disabled', true);
    $('#warning').css('background-color', 'pink')
        .text(message);
}


function clearWarning() {
		log.debug('called clearWarning()');

		$('#tabConllu').prop('disabled', false);
    $('#warning').css('background-color', 'white').text('');
}

function setUndos() {
    log.debug('called setUndos()');
		window.undoManager = new UndoManager();

    const updateUI = () => {
        log.debug('called setUndos:updateUI()');
        btnUndo.prop('disabled', !undoManager.hasUndo());
        btnRedo.prop('disabled', !undoManager.hasRedo());
    }

    const btnUndo = $('#btnUndo').click(() => {
        log.debug('clicked undo');
        undoManager.undo();
        //updateUI();
    });
    const btnRedo = $('#btnRedo').click(() => {
        log.debug('clicked redo');
        undoManager.redo();
        //updateUI()
    });

    undoManager.setCallback(updateUI);
    updateUI();
}
