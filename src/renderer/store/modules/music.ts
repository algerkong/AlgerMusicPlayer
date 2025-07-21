import { defineStore } from 'pinia';

interface MusicState {
  currentMusicList: any[] | null;
  currentMusicListName: string;
  currentListInfo: any | null;
  canRemoveSong: boolean;
}

export const useMusicStore = defineStore('music', {
  state: (): MusicState => ({
    currentMusicList: null,
    currentMusicListName: '',
    currentListInfo: null,
    canRemoveSong: false
  }),

  actions: {
    // 设置当前音乐列表
    setCurrentMusicList(list: any[], name: string, listInfo: any = null, canRemove = false) {
      this.currentMusicList = list;
      this.currentMusicListName = name;
      this.currentListInfo = listInfo;
      this.canRemoveSong = canRemove;
    },

    // 清除当前音乐列表
    clearCurrentMusicList() {
      this.currentMusicList = null;
      this.currentMusicListName = '';
      this.currentListInfo = null;
      this.canRemoveSong = false;
    },

    // 从列表中移除一首歌曲
    removeSongFromList(id: number) {
      if (!this.currentMusicList) return;

      const index = this.currentMusicList.findIndex((song) => song.id === id);
      if (index !== -1) {
        this.currentMusicList.splice(index, 1);
      }
    }
  }
});
