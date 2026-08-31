// Keep the supplied artwork intact; SVG viewBoxes display each icon without its baked-in caption.
export const softwareIconSheet = '/portfolio-assets/11-software/software-icons.png';

type SoftwareTool = {
  id: string;
  name: string;
  crop: [x: number, y: number, width: number, height: number];
};

export const softwareTools: SoftwareTool[] = [
  { id: 'ae', name: 'Adobe After Effects', crop: [63, 52, 249, 251] },
  { id: 'ps', name: 'Adobe Photoshop', crop: [354, 52, 249, 251] },
  { id: 'pr', name: 'Adobe Premiere Pro', crop: [642, 52, 244, 251] },
  { id: 'me', name: 'Adobe Media Encoder', crop: [926, 52, 247, 251] },
  { id: 'jianying', name: '剪映', crop: [1213, 52, 254, 251] },
  { id: 'resolve', name: 'DaVinci Resolve', crop: [63, 371, 249, 236] },
  { id: 'blender', name: 'Blender', crop: [352, 371, 251, 236] },
  { id: 'plasticity', name: 'Plasticity', crop: [643, 371, 246, 236] },
  { id: 'painter', name: 'Substance 3D Painter', crop: [926, 371, 246, 236] },
  { id: 'md', name: 'Marvelous Designer', crop: [1213, 371, 250, 237] },
  { id: 'daz', name: 'DAZ Studio', crop: [166, 678, 253, 242] },
  { id: 'spine', name: 'Spine', crop: [463, 679, 251, 241] },
  { id: 'kujiale', name: '酷家乐', crop: [752, 679, 251, 242] },
];
