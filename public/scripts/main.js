var eventSwiper = undefined;

eventSwiper = new Swiper('.swiper-container', {
    direction: 'horizontal',
    loop: false,
    slidesPerView: 2,
    resistance : true,
    spaceBetween : 12,
    pagination: {
        el: '.swiper-pagination',
        type: 'fraction',
    }
});