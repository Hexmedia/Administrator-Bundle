<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Hexmedia\AdministratorBundle\ControllerInterface\ListController as ListControllerInterface;

class ConfigurationController extends Controller implements ListControllerInterface {

	/**
	 * @var WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
	 */
	private $breadcrumbs;

	/**
	 *
	 * @return WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
	 */
	private function registerBreadcrumbs() {
		$this->breadcrumbs = $this->get("white_october_breadcrumbs");

		$this->breadcrumbs->addItem("Configuration", $this->get('router')->generate('HexMediaConfigurationDisplay'));

		return $this->breadcrumbs;
	}

	/**
	 * @Template()
	 */
	public function displayAction() {
		$this->registerBreadcrumbs();

		return array();
	}

	/**
	 * @Template()
	 */
	public function addAction() {
		$this->registerBreadcrumbs()->addItem("Add");
		return array();
	}

	/**
	 * @Template()
	 */
	public function editAction() {
		return array();
	}

	/*
	 * CRUD ACTIONS
	 */

	/**
	 *
	 */
	public function listAction($page = 1, $pageSize = 10, $sort = 'id', $sortDirection = "ASC") {
		$this->registerBreadcrumbs();
	}

	/**
	 *
	 */
	public function removeAction() {

	}

	/**
	 *
	 */
	public function changeAction() {

	}

}
