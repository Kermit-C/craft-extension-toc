import * as React from 'react';
import * as ReactDOM from 'react-dom';
import craftXIconSrc from './craftx-icon.png';
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
        setInterval(() => refresh(), 1000);
        async function refresh() {
            const { pageTitle, pageId, subBlocks } = await refreshCurrentPage();
            setPageTitle(pageTitle);
            setPageId(pageId);
            setSubBlocks(subBlocks);
            const subSelectedBlockId = await refreshSelectedBlock(subBlocks);
            subSelectedBlockId && setSubSelectedBlockId(subSelectedBlockId);
        }
    }, [pageTitle]);

    return (
        <div>
            <h1>Contents</h1>
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

    const pageTitle = pageBlock.content.map((x) => x.text).join();
    const pageId = pageBlock.id;
    return { pageTitle, pageId, subBlocks: pageBlock.subblocks };
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
        let text = block.content.map((x) => x.text).join();
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

export function initApp() {
    ReactDOM.render(<App />, document.getElementById('react-root'));
}
