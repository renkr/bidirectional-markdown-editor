import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

const MarkdownContext = React.createContext();

export function PreviewPane() {
  const [md, setMd] = useState('# Hello *world* !');
  const [externalMd, setExternalMd] = useState(md);
  // blockId is the line number of the block
  const [caret, setCaret] = useState({ blockId: 0, offset: 0 });
  const components = {
    h1: ({ node, children, ...props }) => (
      <EditableBlock
        node={node}
        setMd={setMd}
        caret={caret}
        setCaret={setCaret}
        setExternalMd={setExternalMd}
        {...props}
      >
        <h1 className="text-5xl mb-2">{children}</h1>
      </EditableBlock>
    ),
    h2: ({ node, children, ...props }) => (
      <EditableBlock
        node={node}
        setMd={setMd}
        caret={caret}
        setCaret={setCaret}
        setExternalMd={setExternalMd}
        {...props}
      >
        <h2 className="text-4xl mb-2">{children}</h2>
      </EditableBlock>
    ),
    h3: ({ node, children, ...props }) => (
      <EditableBlock
        node={node}
        setMd={setMd}
        caret={caret}
        setCaret={setCaret}
        setExternalMd={setExternalMd}
        {...props}
      >
        <h3 className="text-3xl mb-2">{children}</h3>
      </EditableBlock>
    ),
    p: ({ node, children, ...props }) => (
      <EditableBlock
        node={node}
        setMd={setMd}
        caret={caret}
        setCaret={setCaret}
        setExternalMd={setExternalMd}
        {...props}
      >
        <p className="text-base mb-2">{children}</p>
      </EditableBlock>
    ),
  };

  function handleChange(e) {
    setMd(e.target.value);
    setExternalMd(e.target.value);
  }

  const processedReactElements = useMemo(
    () =>
      ReactMarkdown({
        children: md,
        components,
        includeElementIndex: true,
        skipHtml: false,
        sourcePos: true,
      }),
    [md],
  );

  return (
    <MarkdownContext.Provider value={externalMd}>
      <div className="PreviewPane h-full grid grid-cols-2">
        <textarea
          value={externalMd}
          onChange={handleChange}
          contentEditable={false}
          className="PlaneEditor h-full text-base ml-6 p-2 border-r-2 border-gray-300"
        />
        <div className="BlockEditor h-full ml-2">{processedReactElements}</div>
      </div>
    </MarkdownContext.Provider>
  );
}

function EditableBlock({
  node,
  children,
  setMd,
  caret,
  setCaret,
  setExternalMd,
  ...props
}) {
  const ref = useRef(null);
  const externalMd = useContext(MarkdownContext);
  const [otherMd, setOtherMd] = useState({
    before: externalMd.slice(0, node.position.start.offset),
    after: externalMd.slice(node.position.end.offset),
  });

  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark)
    .use(remarkStringify);

  useEffect(() => {
    // if the block is the one with the caret, set the caret position
    // check the start line of the block
    if (node.position.start.line === caret.blockId) {
      setCaretPosition(ref.current, caret.local);
    }
  }, []);

  function handleInput(e) {
    let html = e.target.innerHTML;
    // replace &nbsp; with empty string
    html = html.replace(/&nbsp;/g, '');
    let newMd = '';
    newMd = processor.processSync(html).toString();
    setExternalMd(otherMd.before + newMd + otherMd.after);
  }

  function handleKeyDown(e) {
    //console.log(e.keyCode);
    if (e.keyCode === 13) {
      e.preventDefault();
      // set current block's md
      let newMd = '';
      const range = document.createRange();
      const sel = window.getSelection();
      // make range after caret
      range.setStart(sel.anchorNode, sel.anchorOffset);
      range.setEndAfter(e.target.firstChild.lastChild);
      // get the html of the range
      const parent = document.createElement('div');
      parent.appendChild(range.cloneContents());
      let html1 = parent.innerHTML;
      html1.replace(/&nbsp;/g, '');
      console.log('html1', html1);
      // delete the range
      range.deleteContents();
      // convert the html to markdown
      let html = ref.current.innerHTML;
      // replace &nbsp; with empty string
      html = html.replace(/&nbsp;/g, '');
      newMd = processor.processSync(html).toString();
      const newBlock = processor.processSync(html1).toString();
      // if new block contains no characters create empty block
      if (parent.innerText === '') {
        setExternalMd(otherMd.before + newMd + '\n&nbsp;' + otherMd.after);
        setMd(otherMd.before + newMd + '\n&nbsp;' + otherMd.after);
        setCaret({ blockId: node.position.start.line + 2, local: 0 });
      } else {
        setExternalMd(otherMd.before + newMd + '\n' + newBlock + otherMd.after);
        setMd(otherMd.before + newMd + '\n' + newBlock + otherMd.after);
        setCaret({ blockId: node.position.start.line + 2, local: 0 });
      }
    }
    // if backspace is pressed
    if (e.keyCode === 8) {
      // if caret is at the beginning of the block
      if (getCaretPosition() === 0 || e.target.innerText === '&nbsp;') {
        // if the block is not the first block
        if (node.position.start.line !== 1) {
          e.preventDefault();
          // set current block's md
          let newMd = '';
          const html = e.target.firstChild.innerHTML;
          newMd = processor.processSync(html).toString();
          const prevNodeHtmlLen =
            document.getElementsByClassName('EditableBlock')[props.index - 1]
              .innerText.length;

          // set otherMd
          // connect the newMd to the previous block
          let newBefore = otherMd.before.slice(
            0,
            otherMd.before.lastIndexOf('\n'),
          );
          let i = newBefore.lastIndexOf('\n');
          while (newBefore[i] === '\n') {
            i--;
          }
          newBefore = newBefore.slice(0, i + 1);
          // set the externalMd
          setExternalMd(newBefore + newMd + otherMd.after);

          setMd(newBefore + newMd + otherMd.after);
          // set the caret
          setCaret({
            blockId: node.position.start.line - 2,
            local: prevNodeHtmlLen,
          });
        }
      }
    }
  }

  function handleBlur(e) {
    if (
      e.relatedTarget !== null &&
      e.relatedTarget.className === 'EditableBlock'
    ) {
      const id = e.relatedTarget.getAttribute('data-sourcepos').split(':')[0];

      setCaret({ blockId: id, local: getCaretPosition() });
      setMd(externalMd);
    } else {
      setCaret({ blockId: -1, local: -1 });
    }
  }

  return (
    <div
      className="EditableBlock"
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-sourcepos={props['data-sourcepos']}
    >
      {children}
    </div>
  );
}

EditableBlock.propTypes = {
  children: PropTypes.node.isRequired,
  'data-sourcepos': PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  externalMd: PropTypes.string.isRequired,
  setExternalMd: PropTypes.func.isRequired,
  caret: PropTypes.object.isRequired,
  setCaret: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
  setMd: PropTypes.func.isRequired,
};

function getCaretPosition() {
  const editor = document.activeElement;
  const sel = window.getSelection();
  let range = document.createRange();
  range.setStart(editor, 0);
  range.setEnd(sel.anchorNode, sel.anchorOffset);
  return range.toString().length;
}

// element is the editable block. position is the caret offset.
function setCaretPosition(element, position) {
  const node = getTextNodeByOffset(element, position);
  let offset = 0;
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStart(element, 0);
  range.setEnd(node, 0);
  offset = range.toString().length;
  range.setStart(node, position - offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// recursively get the text node by offset
function getTextNodeByOffset(element, offset) {
  let node = element.firstChild;
  if (node.nodeType === 3 && offset < node.textContent.length) {
    return node;
  }
  let length = 0;
  while (
    node.nextSibling !== null &&
    length + node.textContent.length < offset
  ) {
    length += node.textContent.length;
    node = node.nextSibling;
  }
  if (node.nodeType === 3) {
    return node;
  }
  return getTextNodeByOffset(node, offset - length);
}
