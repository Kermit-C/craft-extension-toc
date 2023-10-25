import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { CraftBlock } from '@craftdocs/craft-extension-api';

const App: React.FC<{}> = () => {
    const isDarkMode = useCraftDarkMode();
    React.useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [isDarkMode]);

    const [pageTitle, setPageTitle] = React.useState<string>('');
    const [pageId, setPageId] = React.useState<string>('');
    const [subBlocks, setSubBlocks] = React.useState<CraftBlock[]>([]);
    const [subSelectedBlockId, setSubSelectedBlockId] = React.useState<string>('');

    React.useEffect(() => {
        refresh();
        async function refresh() {
            try {
                const { pageTitle, pageId, subBlocks } = await refreshCurrentPage();
                setPageTitle(pageTitle);
                setPageId(pageId);
                setSubBlocks(subBlocks);
                const subSelectedBlockId = await refreshSelectedBlock(subBlocks);
                subSelectedBlockId && setSubSelectedBlockId(subSelectedBlockId);

                const timeout = setTimeout(() => {
                    clearTimeout(timeout);
                    refresh();
                }, 1000);
            } catch (err) {
                console.error(err);

                const timeout = setTimeout(() => {
                    clearTimeout(timeout);
                    refresh();
                }, 5000);
            }
        }
    }, [pageTitle]);

    return (
        <div>
            <h1>
                <span style={{ marginRight: '0.25rem' }}>Contents</span>
                <span className="text-btn" onClick={addNo}>
                    ADD NO.
                </span>
                <span className="text-btn" onClick={deleteNo}>
                    DEL NO.
                </span>
            </h1>
            <ul>
                {subBlocks
                    .filter((block) => getIsTextHeaderBlock(block))
                    .map((block) => (
                        <li
                            className={subSelectedBlockId === block.id ? 'selected' : ''}
                            onClick={() => {
                                handleClickBlock(block.spaceId || '', block.id);
                                setSubSelectedBlockId(block.id);
                            }}
                        >
                            {getSubBlockText(block)}
                        </li>
                    ))}
            </ul>
        </div>
    );
};

function useCraftDarkMode() {
    const [isDarkMode, setIsDarkMode] = React.useState(false);

    React.useEffect(() => {
        craft.env.setListener((env) => setIsDarkMode(env.colorScheme === 'dark'));
    }, []);

    return isDarkMode;
}

async function refreshCurrentPage() {
    const result = await craft.dataApi.getCurrentPage();
    if (result.status !== 'success') {
        throw new Error(result.message);
    }
    const pageBlock = result.data;

    const pageTitle = pageBlock.content.map((x) => x.text).join('');
    const pageId = pageBlock.id;
    const subBlocks = pageBlock.subblocks.map((block) => {
        if ('subblocks' in block) {
            block.subblocks.splice(0, block.subblocks.length);
        }
        return block;
    });
    return { pageTitle, pageId, subBlocks };
}

async function refreshSelectedBlock(subBlocks: CraftBlock[]) {
    const result = await craft.editorApi.getSelection();
    if (result.status !== 'success') {
        throw new Error(result.message);
    }
    const selectedBlocks = result.data;
    if (selectedBlocks.length === 0) {
        return '';
    }

    const currentSelectedBlockId = selectedBlocks[0].id;
    const currentSelectedBlockIndex = subBlocks.findIndex((x) => x.id === currentSelectedBlockId);
    if (currentSelectedBlockIndex === -1) {
        return '';
    }

    let subSelectedBlockId = '';
    for (const subBlock of subBlocks.slice(0, currentSelectedBlockIndex + 1)) {
        if (getIsTextHeaderBlock(subBlock)) {
            subSelectedBlockId = subBlock.id;
        }
    }
    return subSelectedBlockId;
}

async function handleClickBlock(spaceId: string, blockId: string) {
    await craft.editorApi.openURL(`craftdocs://open?blockId=${blockId}&spaceId=${spaceId}`);
}

function getIsTextHeaderBlock(block: CraftBlock): boolean {
    if (block.type !== 'textBlock') {
        return false;
    } else {
        return ['title', 'subtitle', 'heading', 'strong'].includes(block.style.textStyle);
    }
}

function getSubBlockText(block: CraftBlock): string {
    if (block.type !== 'textBlock') {
        return '';
    } else {
        let text = block.content.map((x) => x.text).join('');
        switch (block.listStyle.type) {
            case 'numbered':
                if (block.listStyle.ordinal) {
                    text = `${block.listStyle.ordinal}. ${text}`;
                }
                break;
            case 'bullet':
                text = `• ${text}`;
                break;
            case 'todo':
                if (block.listStyle.state === 'unchecked') {
                    text = `□ ${text}`;
                } else if (block.listStyle.state === 'checked') {
                    text = `☑ ${text}`;
                } else if (block.listStyle.state === 'canceled') {
                    text = `☒ ${text}`;
                }
                break;
            case 'toggle':
                text = `▸ ${text}`;
                break;
        }
        switch (block.style.textStyle) {
            case 'title':
                return text;
            case 'subtitle':
                return '　' + text;
            case 'heading':
                return '　　' + text;
            case 'strong':
                return '　　　' + text;
            default:
                return '　　　　' + text;
        }
    }
}

function hasNo(block: CraftBlock): boolean {
    if (block.type !== 'textBlock') {
        return false;
    } else {
        return block.content[0].text.match(/^[\d\.]+$/) !== null && Boolean(block.content[0].isCode);
    }
}

async function addNo() {
    const { subBlocks } = await refreshCurrentPage();

    let topHierarchy = 4;
    let titleNo = 0;
    let subtitleNo = 0;
    let headingNo = 0;
    let strongNo = 0;

    const textHeaderBlock = subBlocks.filter((block) => getIsTextHeaderBlock(block));

    textHeaderBlock.forEach((block) => {
        if (block.type !== 'textBlock') {
            return;
        }

        switch (block.style.textStyle) {
            case 'title':
                if (topHierarchy > 1) {
                    topHierarchy = 1;
                }
                break;
            case 'subtitle':
                if (topHierarchy > 2) {
                    topHierarchy = 2;
                }
                break;
            case 'heading':
                if (topHierarchy > 3) {
                    topHierarchy = 3;
                }
                strongNo = 0;
                break;
            case 'strong':
                if (topHierarchy > 4) {
                    topHierarchy = 4;
                }
                break;
        }
    });
    const getNoPrefix = (currHierarchy: number) => {
        let prefix = '';
        for (let i = topHierarchy; i < currHierarchy; i++) {
            switch (i) {
                case 1:
                    prefix += `${titleNo}.`;
                    break;
                case 2:
                    prefix += `${subtitleNo}.`;
                    break;
                case 3:
                    prefix += `${headingNo}.`;
                    break;
                case 4:
                    prefix += `${strongNo}.`;
                    break;
            }
        }
        return prefix;
    };

    textHeaderBlock.forEach((block) => {
        if (block.type !== 'textBlock') {
            return;
        }
        if (hasNo(block)) {
            block.content.splice(0, 1);
        }

        let currNo = '';
        switch (block.style.textStyle) {
            case 'title':
                currNo = getNoPrefix(1) + `${++titleNo}`;
                subtitleNo = 0;
                headingNo = 0;
                strongNo = 0;
                break;
            case 'subtitle':
                currNo = getNoPrefix(2) + `${++subtitleNo}`;
                headingNo = 0;
                strongNo = 0;
                break;
            case 'heading':
                currNo = getNoPrefix(3) + `${++headingNo}`;
                strongNo = 0;
                break;
            case 'strong':
                currNo = getNoPrefix(4) + `${++strongNo}`;
                break;
            default:
                return;
        }

        if (!block.content[0].text.startsWith(' ')) {
            block.content[0].text = ' ' + block.content[0].text;
        }
        block.content.unshift({ text: currNo, isCode: true });
    });

    const updateResult = await craft.dataApi.updateBlocks(textHeaderBlock);
    if (updateResult.status !== 'success') {
        throw new Error(updateResult.message);
    }
}

async function deleteNo() {
    const { subBlocks } = await refreshCurrentPage();

    const textHeaderBlock = subBlocks.filter((block) => getIsTextHeaderBlock(block));
    textHeaderBlock.forEach((block) => {
        if (block.type !== 'textBlock') {
            return;
        }
        if (hasNo(block)) {
            block.content.splice(0, 1);
        }
        if (block.content[0].text.startsWith(' ')) {
            block.content[0].text = block.content[0].text.slice(1);
        }
    });

    const updateResult = await craft.dataApi.updateBlocks(textHeaderBlock);
    if (updateResult.status !== 'success') {
        throw new Error(updateResult.message);
    }
}

export function initApp() {
    ReactDOM.render(<App />, document.getElementById('react-root'));
}
