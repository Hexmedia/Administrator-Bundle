<?php

namespace Hexmedia\AdministratorBundle\ControllerInterface;

interface ListController {

	public function listAction($page = 1, $pageSize = 10, $sort = 'id', $sortDirection = "ASC");
}
