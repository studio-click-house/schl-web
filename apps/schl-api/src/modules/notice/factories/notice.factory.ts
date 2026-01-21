import { CreateNoticeBodyDto } from '../dto/create-notice.dto';

export class NoticeFactory {
    static fromCreateDto(body: CreateNoticeBodyDto) {
        return {
            channel: body.channel, // now an array of departments
            notice_no: body.noticeNo.trim(),
            title: body.title.trim(),
            description: body.description.trim(),
            file_name: body.fileName ?? null,
        };
    }

    static fromUpdateDto(body: Partial<CreateNoticeBodyDto>) {
        const patch: Record<string, unknown> = {};
        if (Array.isArray(body.channel)) patch.channel = body.channel;
        if (typeof body.noticeNo === 'string')
            patch.notice_no = body.noticeNo.trim();
        if (typeof body.title === 'string') patch.title = body.title.trim();
        if (typeof body.description === 'string')
            patch.description = body.description.trim();
        if (body.fileName !== undefined)
            patch.file_name = body.fileName ?? null;
        return patch;
    }
}
