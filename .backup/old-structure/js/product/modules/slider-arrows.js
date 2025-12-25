/**
 * Thumbnail slider arrows.
 */

export function createSliderArrows(thumbsDiv) {
  const leftArrow = document.createElement('button');
  leftArrow.innerHTML = '<';
  leftArrow.style.cssText = 'position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
  leftArrow.onclick = () => {
    thumbsDiv.scrollBy({ left: -160, behavior: 'smooth' });
  };

  const rightArrow = document.createElement('button');
  rightArrow.innerHTML = '>';
  rightArrow.style.cssText = 'position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
  rightArrow.onclick = () => {
    thumbsDiv.scrollBy({ left: 160, behavior: 'smooth' });
  };

  return { leftArrow, rightArrow };
}
