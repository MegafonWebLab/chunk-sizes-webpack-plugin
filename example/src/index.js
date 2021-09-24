const func = async () => {
        return import(/* webpackChunkName: 'chunkOne' */ './modules/one');
};

const func2 = async () => {
    return import(/* webpackChunkName: 'chunkTwo' */ './modules/two');
};


export default () => {
    func();
    func2();
}
