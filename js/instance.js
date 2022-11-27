/*
 * @Desc: 
 * @version: 
 * @Date: 2022-10-31 20:55:14
 * @LastEditTime: 2022-11-22 14:27:05
 */

// 把axios发送请求的公共信息进行提取、
let instance = axios.create();
instance.defaults.baseURL = 'http://127.0.0.1:8888';
instance.defaults.headers['Content-Type'] = 'multipart/form-data';
instance.defaults.transformRequest = (data, headers) => {
	const contentType = headers['Content-Type'];
	if (contentType === 'application/x-www-form-urlencoded') return Qs.stringify(data);
	return data;
}
instance.interceptors.response.use(response => {
	return response.data;
});