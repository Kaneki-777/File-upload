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
	let _file = [];
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
		if (_file.length === 0) {
			alert('请您先选择要上传的文件~~');
			return;
		}
		changeDisable(true);
		// 循环发送请求
		let upload_list_arr = Array.from(upload_list.querySelectorAll('li'));
		_file = _file.map(item => {
			let fm = new FormData;
			curLi = upload_list_arr.find(liBox => liBox.getAttribute('key') === item.key),
				curSpan = curLi ? curLi.querySelector('span:nth-last-child(1)') : null;
			fm.append('file', item.file);
			fm.append('filename', item.filename);
			return instance.post('/upload_single', fm, {
				// 监测每一个的上传进度
				onUploadProgress(ev) {
					if (curSpan) {
						curSpan.innerHTML = `${(ev.loaded/ev.total*100).toFixed(2)}%`
					}
				}
			}).then(data => {
				if (+data.code === 0) {
					if (curSpan) {
						curSpan.innerHTML = `100%`
					}
					return;
				}
				return Promise.reject();
			})
		})

		Promise.all(_file).then(() => {
			alert('恭喜您，所有文件都上传成功~~');
		}).catch(() => {
			alert('很遗憾，上传过程中出现问题，请您稍后再试~~');
		}).finally(() => {
			changeDisable(false);
			_file = [];
			upload_list.innerHTML = '';
			upload_list.style.display = 'none';
		});
	})
	// 基于事件委托实现移除的操作
	upload_list.addEventListener('click', function (ev) {
		let target = ev.target,
			curLi = null,
			key;
		if (target.tagName === 'EM') {
			curLi = target.parentNode.parentNode;
			if (!curLi) return;
			upload_list.removeChild(curLi);
			key = curLi.getAttribute("key");
			_file = _file.filter(item => item.key !== key);
			if (_file.length === 0) {
				upload_list.style.display = 'none';
			}
		}
	});
	// 随机数生成函数
	const createRandom = function () {
		let ran = Math.random() * new Date();
		return ran.toString(16).replace('.', '')
	};
	upload_inp.addEventListener('change', async function () {
		_file = Array.from(upload_inp.files);
		if (_file.length === 0) return;
		// 重构集合的数据结构，给每一项设置一个位置值，作为自定义属性存储到元素上，后期点击删除按钮的时候，我们基于这个自定义属性获取唯一值，
		// 再到集合中根据这个唯一值删除集合中这一项
		_file = _file.map(file => {
			return {
				file,
				filename: file.name,
				key: createRandom()
			}
		})
		let str = ``;
		_file.forEach((item, index) => {
			str += `<li key=${item.key}>
				<span>文件${index+1}：${item.filename}</span>
				<span><em>移除</em></span>
			</li>`;
		})
		upload_list.innerHTML = str;
		upload_list.style.display = 'block';
	})
	upload_button_select.addEventListener('click', function () {
		if (checkIsDisable(this)) return;
		upload_inp.click();
	});
})();