import type { PluginItem } from '@babel/core';
declare type presetsType = PluginItem[] | undefined;
declare type pluginsType = PluginItem[] | undefined;
export declare function initParse(babelPresets?: presetsType, babelPlugins?: pluginsType): (code: string) => any;
export {};
