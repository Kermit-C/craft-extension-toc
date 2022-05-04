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
        refreshCurrentPage();
        setInterval(() => refreshCurrentPage(), 1000);
        setInterval(() => refreshSelectedBlock(), 3000);
    }, [pageTitle]);
    async function refreshCurrentPage() {
        const result = await craft.dataApi.getCurrentPage();
        if (result.status !== 'success') {
            throw new Error(result.message);
        }
        const pageBlock = result.data;

        const pageTitle = pageBlock.content.map((x) => x.text).join();
        const pageId = pageBlock.id;
        setPageTitle(pageTitle);
        setPageId(pageId);
        if (pageBlock.type === 'textBlock') {
            setSubBlocks(pageBlock.subblocks);
        }
    }
    async function refreshSelectedBlock() {
        const result = await craft.editorApi.getSelection();
        if (result.status !== 'success') {
            throw new Error(result.message);
        }
        const selectedBlocks = result.data;
        if (selectedBlocks.length === 0) {
            return;
        }

        let subSelectedBlockId = '';
        for (const subBlock of subBlocks) {
            if (getIsTextHeaderBlock(subBlock)) {
                subSelectedBlockId = subBlock.id;
            }
            if (subBlock.id === selectedBlocks[0].id) {
                break;
            }
        }
        subSelectedBlockId && setSubSelectedBlockId(subSelectedBlockId);
    }

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
        const text = block.content.map((x) => x.text).join();
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
