export interface IHotSinger {
  code: number;
  more: boolean;
  artists: Artist[];
}

export interface Artist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: string[];
  trans: string;
  musicSize: number;
  topicPerson: number;
  showPrivateMsg?: any;
  isSubed?: any;
  accountId?: number;
  picId_str?: string;
  img1v1Id_str: string;
  transNames?: string[];
  followed: boolean;
  mvSize?: any;
  publishTime?: any;
  identifyTag?: any;
  alg?: any;
  fansCount?: any;
  cover?: string;
  avatar?: string;
}
