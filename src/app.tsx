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
    const [subBlocks, setSubBlocks] = React.useState<CraftBlock[]>([]);

    React.useEffect(() => {
        refreshCurrentPage();
        setInterval(() => refreshCurrentPage(), 1000);
    }, [pageTitle]);
    async function refreshCurrentPage() {
        const result = await craft.dataApi.getCurrentPage();
        if (result.status !== 'success') {
            throw new Error(result.message);
        }
        const pageBlock = result.data;

        const pageTitle = pageBlock.content.map((x) => x.text).join();
        setPageTitle(pageTitle);
        if (pageBlock.type === 'textBlock') {
            setSubBlocks(pageBlock.subblocks);
        }
    }

    return (
        <div>
            <h1>Contents</h1>
            <ul>
                {subBlocks
                    .filter((block) => getIsTextHeaderBlock(block))
                    .map((block) => (
                        <li onClick={async () => await handleClickBlock(block.id)}>{getSubBlockText(block)}</li>
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

async function handleClickBlock(blockId: string) {
    await craft.editorApi.navigateToBlockId(blockId);
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
