import {
    Body,
    Controller,
    Delete,
    Get,
    Post,
    Query,
    UseFilters,
} from '@nestjs/common';
import { CopyFileDto } from './dto/copy-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { QnapExceptionFilter } from './qnap-exception.filter';
import { QnapService } from './qnap.service';
import type { ApiResponse } from './qnap.types';

@Controller('qnap')
@UseFilters(QnapExceptionFilter)
export class QnapController {
    constructor(private readonly qnapService: QnapService) {}

    @Get('list')
    async listFiles(@Query() query: ListFilesDto) {
        return this.qnapService.listFolderContents(query);
    }

    @Post('folder')
    async createFolder(@Body() body: CreateFolderDto) {
        return this.qnapService.createFolder(body.path, body.name);
    }

    @Post('rename')
    async renameFile(@Body() body: RenameFileDto) {
        return this.qnapService.rename(body.path, body.oldName, body.newName);
    }

    @Post('move')
    async moveFiles(@Body() body: MoveFileDto) {
        return this.qnapService.move(
            body.sourcePath,
            body.items,
            body.destPath,
            body.mode,
        );
    }

    @Post('copy')
    async copyFiles(@Body() body: CopyFileDto): Promise<ApiResponse> {
        const result = await this.qnapService.copy(
            body.sourcePath,
            body.items,
            body.destPath,
            {
                mode: body.mode,
                dup: body.dup,
                checksum: body.checksum,
                sourcePort: body.sourcePort,
                destPort: body.destPort,
                waitSec: body.waitSec,
                restoreLog: body.restoreLog,
            },
        );

        return result;
    }

    @Delete('delete')
    async deleteFiles(@Body() body: DeleteFileDto) {
        return this.qnapService.delete(body.path, body.items, {
            force: body.force,
        });
    }
}
