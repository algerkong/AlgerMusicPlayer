import type { SongResult } from '@/types/music';
import type { DjProgram } from '@/types/podcast';

/**
 * 将播客节目转换为播放列表所需的 SongResult 格式
 * @param program 播客节目数据
 * @returns SongResult 格式数据
 */
export const mapDjProgramToSongResult = (program: DjProgram): SongResult => {
  return {
    id: program.mainSong.id,
    name: program.mainSong.name || program.name || '播客节目',
    duration: program.mainSong.duration,
    picUrl: program.coverUrl,
    ar: [
      {
        id: program.radio.id,
        name: program.radio.name,
        picId: 0,
        img1v1Id: 0,
        briefDesc: '',
        picUrl: '',
        img1v1Url: '',
        albumSize: 0,
        alias: [],
        trans: '',
        musicSize: 0,
        topicPerson: 0
      }
    ],
    al: {
      id: program.radio.id,
      name: program.radio.name,
      picUrl: program.coverUrl,
      type: '',
      size: 0,
      picId: 0,
      blurPicUrl: '',
      companyId: 0,
      pic: 0,
      picId_str: '',
      publishTime: 0,
      description: '',
      tags: '',
      company: '',
      briefDesc: '',
      artist: {
        id: 0,
        name: '',
        picUrl: '',
        alias: [],
        albumSize: 0,
        picId: 0,
        img1v1Url: '',
        img1v1Id: 0,
        trans: '',
        briefDesc: '',
        musicSize: 0,
        topicPerson: 0
      },
      songs: [],
      alias: [],
      status: 0,
      copyrightId: 0,
      commentThreadId: '',
      artists: [],
      subType: '',
      onSale: false,
      mark: 0
    },
    source: 'netease',
    count: 0,
    isPodcast: true,
    program
  };
};
