import type { Rules, FileExtension, ExtraRule } from '../types';
declare function transform(code: string, ext: FileExtension, rules: Rules, filePath: string, extraRule?: ExtraRule): {
    code: string;
};
export default transform;
