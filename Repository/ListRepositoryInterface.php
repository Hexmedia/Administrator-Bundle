<?php

namespace Hexmedia\AdministratorBundle\Repository;

interface ListRepositoryInterface {

	public function getPage($page = 1, $sort = 'id', $pageSize = 10, $sortDirection = 'ASC', $fields = array());

	public function getCount();
}

?>
