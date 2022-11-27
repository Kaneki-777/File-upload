// 延迟函数
const delay = function (interval) {
	typeof interval !== "number" ? interval = 1000 : null;
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, interval);
	})
};

/* 基于FORM-DATA实现文件上传 */
(function () {
	let upload = document.querySelector('#upload1'),
		upload_inp = upload.querySelector('.upload_inp'),
		upload_button_select = upload.querySelector('.upload_button.select'),
		upload_button_upload = upload.querySelector('.upload_button.upload'),
		upload_tip = upload.querySelector('.upload_tip'),
		upload_list = upload.querySelector('.upload_list');
	let _file = null;

	// 上传文件到服务器
	const changeDisable = flag => {
		if (flag) {
			upload_button_select.classList.add('disable');
			upload_button_upload.classList.add('loading');
			return;
		}
		upload_button_select.classList.remove('disable');
		upload_button_upload.classList.remove('loading');
	};
	upload_button_upload.addEventListener('click', function () {
		if (upload_button_upload.classList.contains('disable') || upload_button_upload.classList.contains('loading')) return;
		if (!_file) {
			alert('请您先选择要上传的文件~~');
			return;
		}
		changeDisable(true);
		// 把文件传递给服务器：FormData / BASE64
		let formData = new FormData();
		formData.append('file', _file);
		formData.append('filename', _file.name);
		instance.post('/upload_single', formData).then(data => {
			if (+data.code === 0) {
				alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
				return;
			}
			return Promise.reject(data.codeText);
		}).catch(err => {
			alert('文件上传失败，请您稍后再试~~');
		}).finally(() => {
			clearHandle();
			changeDisable(false);
		})
	})


	// 移除按钮的点击处理
	const clearHandle = () => {
		_file = null;
		upload_tip.style.display = 'block';
		upload_list.style.display = 'none';
		upload_list.innerHTML = ``;
	};
	upload_list.addEventListener('click', function (e) {
		let target = ev.target;
		if (target.tagName === 'EM') {
			// 点击的是移除按钮
			clearHandle();
		}
	})
	// 监听用户选择文件的操作
	upload_inp.addEventListener('change', function () {
		// 获取用户选中的文件对象
		//   + name：文件名
		//   + size：文件大小 B
		//   + type：文件的MIME类型
		let file = upload_inp.files[0];
		if (!file) return;

		// 限制文件上传的大小
		if (file.size > 2 * 1024 * 1024) {
			alert('上传的文件不能超过2MB~~');
			return;
		};
		_file = file;

		// 显示上传的文件
		upload_tip.style.display = 'none';
		upload_list.style.display = 'block';
		upload_list.innerHTML = `<li>
			<span>文件：${file.name}</span>
			<span><em>移除</em></span>
		</li>`
	});
	// 点击选择文件按钮，触发上传文件INPUT框选择文件的行为
	upload_button_select.addEventListener('click', function () {
		if (upload_button_select.classList.contains('disable') || upload_button_select.classList.contains('loading')) return;
		upload_inp.click();
	})
})();

/* 基于BASE64实现文件上传 */
(function () {
	let upload = document.querySelector('#upload2'),
		upload_inp = upload.querySelector('.upload_inp'),
		upload_button_select = upload.querySelector('.upload_button.select');
	// 验证是否处于可操作性状态
	const checkIsDisable = element => {
		let classList = element.classList;
		return classList.contains('disable') || classList.contains('loading');
	};
	// 把选择文件对象读取成BASE64
	const changeBASE64 = file => {
		return new Promise(resolve => {
			let fileReader = new FileReader();
			fileReader.readAsDataURL(file);
			fileReader.onload = ev => {
				resolve(ev.target.result)
			}
		})
	}
	upload_inp.addEventListener('change', async function () {
		let file = upload_inp.files[0],
			BASE64,
			data;
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			alert('上传的文件不能超过2MB~~');
			return;
		}
		upload_button_select.classList.add('loading');
		BASE64 = await changeBASE64(file);
		try {
			data = await instance.post('/upload_single_base64', {
				file: encodeURIComponent(BASE64),
				filename: file.name
			}, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			});
			if (+data.code === 0) {
				alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 地址去访问~~`);
				return;
			}
			throw data.codeText;
		} catch (err) {
			alert('很遗憾，文件上传失败，请您稍后再试~~');
		} finally {
			upload_button_select.classList.remove('loading');
		}


	});
	upload_button_select.addEventListener('click', function () {
		// 给当前元素的某个行为绑定方法，事件行为中的方法触发this指向的是元素本身
		if (checkIsDisable(this)) return;
		upload_inp.click();
	});
})();

/* 文件缩略图 & 自动生成名字 */
(function () {
	let upload = document.querySelector('#upload3'),
		upload_inp = upload.querySelector('.upload_inp'),
		upload_button_select = upload.querySelector('.upload_button.select'),
		upload_button_upload = upload.querySelector('.upload_button.upload'),
		upload_abbre = upload.querySelector('.upload_abbre'),
		upload_abbre_img = upload_abbre.querySelector('img');
	let _file = null;

	// 验证是否处于可操作性状态
	const checkIsDisable = element => {
		let classList = element.classList;
		return classList.contains('disable') || classList.contains('loading');
	};

	// 把选择文件对象读取成BASE64
	const changeBASE64 = file => {
		return new Promise(resolve => {
			let fileReader = new FileReader();
			fileReader.readAsDataURL(file);
			fileReader.onload = ev => {
				resolve(ev.target.result)
			}
		})
	};
	const changeBuffer = file => {
		return new Promise(resolve => {
			let fileReader = new FileReader();
			fileReader.readAsArrayBuffer(file);
			fileReader.onload = ev => {
				let buffer = ev.target.result,
					spark = new SparkMD5.ArrayBuffer(),
					HASH,
					suffix;
				spark.append(buffer);
				HASH = spark.end(HASH);
				suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
				resolve({
					buffer,
					HASH,
					suffix,
					filename: `${HASH}.${suffix}`
				})
			}
		})
	}

	// 上传文件到服务器
	const changeDisable = flag => {
		if (flag) {
			upload_button_select.classList.add('disable');
			upload_button_upload.classList.add('loading');
			return;
		}
		upload_button_select.classList.remove('disable');
		upload_button_upload.classList.remove('loading');
	};
	upload_button_upload.addEventListener('click', async function () {
		if (checkIsDisable(this)) return;
		if (!_file) {
			alert('请您先选择要上传的文件~~');
			return;
		}
		changeDisable(true);
		// 生成文件的hash名
		let {
			filename
		} = await changeBuffer(_file);
		// 把文件传递给服务器：FormData / BASE64
		let formData = new FormData();
		formData.append('file', _file);
		formData.append('filename', filename);
		instance.post('/upload_single_name', formData).then(data => {
			if (+data.code === 0) {
				alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
				return;
			}
			return Promise.reject(data.codeText);
		}).catch(err => {
			alert('文件上传失败，请您稍后再试~~');
		}).finally(() => {
			changeDisable(false);
			upload_abbre.style.display = 'none';
			upload_abbre_img.src = '';
			_file = null;
		})
	})
	// 移除按钮的点击处理

	// 文件预览，就是把文件对象转换为BASE64，赋值给图片的SRC属性即可
	upload_inp.addEventListener('change', async function () {
		let file = upload_inp.files[0],
			BASE64;
		if (!file) return;
		_file = file;
		upload_button_select.classList.add('disable');
		BASE64 = await changeBASE64(file);
		console.log(BASE64);
		upload_abbre.style.display = 'block';
		upload_abbre_img.src = BASE64;
		upload_button_select.classList.remove('disable');
	});
	upload_button_select.addEventListener('click', function () {
		// 给当前元素的某个行为绑定方法，事件行为中的方法触发this指向的是元素本身
		if (checkIsDisable(this)) return;
		upload_inp.click();
	});
})();

/* 进度管控 */
(function () {
	let upload = document.querySelector('#upload4'),
		upload_inp = upload.querySelector('.upload_inp'),
		upload_button_select = upload.querySelector('.upload_button.select'),
		upload_progress = upload.querySelector('.upload_progress'),
		upload_progress_value = upload_progress.querySelector('.value');

	// 验证是否处于可操作性状态
	const checkIsDisable = element => {
		let classList = element.classList;
		return classList.contains('disable') || classList.contains('loading');
	};
	// 监听用户选择文件的操作
	upload_inp.addEventListener('change', async function () {
		let file = upload_inp.files[0],
			data;
		if (!file) return;
		upload_button_select.classList.add('loading');

		let formData = new FormData();
		formData.append('file', file);
		formData.append('filename', file.name);

		try {
			data = await instance.post('/upload_single', formData, {
				// 文件上传中回调函数 xhr.upload.onprogress
				onUploadProgress(ev) {
					let {
						loaded,
						total
					} = ev;
					upload_progress.style.display = 'block';
					upload_progress_value.style.width = `${loaded/total*100}%`;
				}
			})
			if (+data.code === 0) {
				upload_progress_value.style.width = '100%';
				delay(300);
				alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
				// alert 阻碍页面渲染，弹窗不关，页面不渲染
				return;
			}
			throw data.codeText;
		} catch (error) {
			alert('文件上传失败，请您稍后再试~~');
		} finally {
			upload_button_select.classList.remove('loading');
			upload_progress.style.display = 'none';
			upload_progress_value.style.width = `0%`;
		}
	});
	// 点击选择文件按钮，触发上传文件INPUT框选择文件的行为
	upload_button_select.addEventListener('click', function () {
		if (checkIsDisable(this)) return;
		upload_inp.click();
	})
})();


/* 多文件上传 */
(function () {
	let upload = document.querySelector('#upload5'),
		upload_inp = upload.querySelector('.upload_inp'),
		upload_button_select = upload.querySelector('.upload_button.select'),
		upload_button_upload = upload.querySelector('.upload_button.upload'),
		upload_list = upload.querySelector('.upload_list');
	let _file = null;
	const checkIsDisable = element => {
		let classList = element.classList;
		return classList.contains('disable') || classList.contains('loading');
	};

	// 上传文件到服务器
	const changeDisable = flag => {
		if (flag) {
			upload_button_select.classList.add('disable');
			upload_button_upload.classList.add('loading');
			return;
		}
		upload_button_select.classList.remove('disable');
		upload_button_upload.classList.remove('loading');
	};
	upload_button_upload.addEventListener('click', async function () {
		if (checkIsDisable(this)) return;
		if (!_file) {
			alert('请您先选择要上传的文件~~');
			return;
		}
		changeDisable(true);
		// 生成文件的hash名
		let {
			filename
		} = await changeBuffer(_file);
		// 把文件传递给服务器：FormData / BASE64
		let formData = new FormData();
		formData.append('file', _file);
		formData.append('filename', filename);
		instance.post('/upload_single_name', formData).then(data => {
			if (+data.code === 0) {
				alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
				return;
			}
			return Promise.reject(data.codeText);
		}).catch(err => {
			alert('文件上传失败，请您稍后再试~~');
		}).finally(() => {
			changeDisable(false);
			_file = null;
		})
	})
	upload_inp.addEventListener('change', async function () {
		_file = upload_inp.files;
		console.log(_file);
	})
	upload_button_select.addEventListener('click', function () {
		// 给当前元素的某个行为绑定方法，事件行为中的方法触发this指向的是元素本身
		if (checkIsDisable(this)) return;
		upload_inp.click();
	});
})();