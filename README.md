# HDC Back End
> author by jh.jeong

-  Node js + Express + Typeorm
0. 개발 기술 스택 관련 명세
    - typeorm : entity & active record 환경
    - express : middleware + api
    - mysql : v5.7, inno_db
1. START!!
    1. npm i
    2. .env.development -> mysql username, password set
    4. npm i -g nodemon
    3. npm start
2. ./src 내에 각 폴더 별 기능 명세
	1. entity : **typeorm** 기반으로 구성된 테이블 구조와 각 테이블별 함수
    2. lib : db connection, token, string formatter 등 각종 library 모음
    3. ./routes/api/ : api 목록
        - 현재 **v1** 으로 진입
        - /api/v1/폴더명/index.ts 구조.
        - 폴더명 == api 기능 카테고리

3. 자동 생성 커맨드 hygen 사용. ( npm i -g hygen ) ( 현재 사용안함 ~~아직 설정이 미흡..시간이없음~~)
	- 아래 커맨드에 "" 표시는 제외하고 해주세요.
    - 커맨드에는 모두 소문자만 사용합니다.
    - //inject point : inject code 를 위한 주석입니다.
	- entity generate cmd : hygen hdc new_entity --name "table name ex ) users"
	```
	hygen hdc new_entity --name users
	```
    - api generate cmd : hygen hdc new_api --name "api category name ex ) auth"
    ```
    hygen hdc new_api --name auth
    ```
    - api add cmd : hygen hdc add_api --api_category "api category ex ) auth" --api_name "api name ex ) login" --api_type "method type ex) POST" 
    ```
    hygen hdc add_api --api_category auth --api_name login --api_type POST
    ```
	
4. api 파일 상단 Description 규칙
	```
	/******************************************************************************
    * entity : -> 사용한 entity 명세 
        * User
            * 유저 정보를 받아와 로그인시 검증하기 위한 entity
    * api : -> api 기능 명세
        * login
            - 타입 : POST
            - 파라미터 : req.body.username, req.body.pw
            - 기능 : 유저가 페이지에 로그인 하는 기능
            - paylaod : {
                ~~~
            }
    ******************************************************************************/
	```

5. entity 파일 상단 Description 규칙
	```
	/******************************************************************************
    * entitiy 이름 ex ) User
    * column : -> 컬럼 기능 명세
        * ex ) id : row index
        * ex ) name : ~~ 이름
    * function : -> 해당 entity에 종속적인 함수 생성시 기능 명세
        * ex ) findByName : 이름으로 로우를 검색 기능
    ******************************************************************************/
	```


6. typeorm 작성 규칙
	- TEP 로컬서버는 Microsoft sql server 사용으로 인하여, update(로우 아이디, 로우 데이터) 형태로 orm 을 사용할 수 없음.
    - ~~Update 시에 primary key 까지 업데이트하려고 해서 그런다나 모라나..~~
	- update 문은 수정할 컬럼들만 넣고, where 아이디 로 보내야합니다.
    ```
    getConnection()
        .createQueryBuilder()
        .update(SignRecvList)
        .set({ visible : true })
        .where({ `sign_id=${ sign_data.id}` })
        .execute();
    ```
    - 기본적으로 한번의 API당 한번의 트랜잭션 사용을 추구하도록 노력.
    - 아래처럼 트랜잭션 사용하면 됨.
    ```
    await getConnection().transaction( async tr=>{
        tr.query(`SELECT * FROM ANY_TB`);
    });
    ```

7. UNOCONV 관련 ( 현재 사용 안함 )
    > OSX의 경우
    ```
    1. https://www.libreoffice.org/donate/dl/mac-x86_64/7.1.5/ko/LibreOffice_7.1.5_MacOS_x86-64.dmg
    2. 다운로드 후 설치
    3. pip -h // pip 모듈이 있는지 확인. 없다면 설치필요
    4. pip install unoserver
    5. unoconv -h // description 이 뜨면 성공
    6. unoconv -f pdf 파일경로/파일이름
    ```
    > Windows 의 경우
    ```
    1. https://www.libreoffice.org/donate/dl/win-x86_64/7.1.5/ko/LibreOffice_7.1.5_Win_x64.msi
        다운로드 후 설치
    2. C:/Program Files/LibreOffice/program/soffice.bin --headless --convert-to pdf 파일경로/파일이름
    ```

8. 라이브러리 관련 유의점
    > JSZIP
    - decodeFileName 이라는 콜백함수를 쓰려고 하면 에러가 발생함. 공식문서에는 사용하라고 만든 함수인데, typescript에는 추가를 안해준듯.
    - 그래서 그냥 fork 뜬 repo를 설치해놓음