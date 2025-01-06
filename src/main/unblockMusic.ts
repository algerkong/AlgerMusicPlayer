import match from '@unblockneteasemusic/server';

const unblockMusic = async (id: any, songData: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    match(parseInt(id, 10), ['qq', 'migu', 'kugou', 'joox'], songData)
      .then((data) => {
        resolve({
          data: {
            data,
            params: {
              id,
              type: 'song'
            }
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export { unblockMusic };
